#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, BytesN, Env,
};
use escrow::{EscrowContract, EscrowContractClient};

#[test]
fn test_create_and_claim_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token contract
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    
    // Setup accounts
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Mint tokens to sender
    token::StellarAssetClient::new(&env, &token_address).mint(&sender, &1000);
    
    // Deploy escrow contract
    let escrow_contract = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
    
    // Initialize contract
    escrow_client.initialize(&admin);
    
    // Create escrow
    let escrow_id = BytesN::from_array(&env, &[1u8; 32]);
    let claim_secret = BytesN::from_array(&env, &[2u8; 32]);
    
    // Calculate recipient hash (simplified for test)
    let mut hash_input = soroban_sdk::Vec::new(&env);
    for byte in recipient.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    for byte in claim_secret.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    let recipient_hash = env.crypto().sha256(&hash_input.to_bytes());
    
    let amount = 500i128;
    let expiry_ledger = env.ledger().sequence() + 1000;
    
    // Create escrow
    let returned_id = escrow_client.create_escrow(
        &escrow_id,
        &sender,
        &recipient_hash,
        &token_address,
        &amount,
        &expiry_ledger,
    );
    
    assert_eq!(returned_id, escrow_id);
    
    // Check sender balance decreased
    assert_eq!(token_client.balance(&sender), 500);
    
    // Claim escrow
    escrow_client.claim(&escrow_id, &recipient, &claim_secret);
    
    // Check recipient received tokens
    assert_eq!(token_client.balance(&recipient), 500);
    
    // Verify escrow is marked as claimed
    let escrow_data = escrow_client.get_escrow(&escrow_id);
    assert!(escrow_data.is_claimed);
    assert!(!escrow_data.is_refunded);
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token contract
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    
    // Setup accounts
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Mint tokens to sender
    token::StellarAssetClient::new(&env, &token_address).mint(&sender, &1000);
    
    // Deploy escrow contract
    let escrow_contract = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
    
    // Initialize contract
    escrow_client.initialize(&admin);
    
    // Create escrow with short expiry
    let escrow_id = BytesN::from_array(&env, &[3u8; 32]);
    let claim_secret = BytesN::from_array(&env, &[4u8; 32]);
    
    let mut hash_input = soroban_sdk::Vec::new(&env);
    for byte in recipient.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    for byte in claim_secret.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    let recipient_hash = env.crypto().sha256(&hash_input.to_bytes());
    
    let amount = 300i128;
    let expiry_ledger = env.ledger().sequence() + 10;
    
    escrow_client.create_escrow(
        &escrow_id,
        &sender,
        &recipient_hash,
        &token_address,
        &amount,
        &expiry_ledger,
    );
    
    // Check sender balance decreased
    assert_eq!(token_client.balance(&sender), 700);
    
    // Advance ledger past expiry
    env.ledger().with_mut(|li| {
        li.sequence_number = expiry_ledger + 1;
    });
    
    // Refund escrow
    escrow_client.refund(&escrow_id);
    
    // Check sender received refund
    assert_eq!(token_client.balance(&sender), 1000);
    
    // Verify escrow is marked as refunded
    let escrow_data = escrow_client.get_escrow(&escrow_id);
    assert!(!escrow_data.is_claimed);
    assert!(escrow_data.is_refunded);
}

#[test]
#[should_panic(expected = "Escrow not yet expired")]
fn test_cannot_refund_before_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token contract
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    
    // Setup accounts
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Mint tokens to sender
    token::StellarAssetClient::new(&env, &token_address).mint(&sender, &1000);
    
    // Deploy escrow contract
    let escrow_contract = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
    
    // Initialize contract
    escrow_client.initialize(&admin);
    
    // Create escrow with future expiry
    let escrow_id = BytesN::from_array(&env, &[5u8; 32]);
    let claim_secret = BytesN::from_array(&env, &[6u8; 32]);
    
    let mut hash_input = soroban_sdk::Vec::new(&env);
    for byte in recipient.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    for byte in claim_secret.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    let recipient_hash = env.crypto().sha256(&hash_input.to_bytes());
    
    let amount = 300i128;
    let expiry_ledger = env.ledger().sequence() + 1000;
    
    escrow_client.create_escrow(
        &escrow_id,
        &sender,
        &recipient_hash,
        &token_address,
        &amount,
        &expiry_ledger,
    );
    
    // Try to refund before expiry (should panic)
    escrow_client.refund(&escrow_id);
}

#[test]
#[should_panic(expected = "Escrow already claimed")]
fn test_cannot_refund_claimed_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy token contract
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    
    // Setup accounts
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Mint tokens to sender
    token::StellarAssetClient::new(&env, &token_address).mint(&sender, &1000);
    
    // Deploy escrow contract
    let escrow_contract = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
    
    // Initialize contract
    escrow_client.initialize(&admin);
    
    // Create escrow
    let escrow_id = BytesN::from_array(&env, &[7u8; 32]);
    let claim_secret = BytesN::from_array(&env, &[8u8; 32]);
    
    let mut hash_input = soroban_sdk::Vec::new(&env);
    for byte in recipient.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    for byte in claim_secret.to_bytes().iter() {
        hash_input.push_back(byte);
    }
    let recipient_hash = env.crypto().sha256(&hash_input.to_bytes());
    
    let amount = 300i128;
    let expiry_ledger = env.ledger().sequence() + 100;
    
    escrow_client.create_escrow(
        &escrow_id,
        &sender,
        &recipient_hash,
        &token_address,
        &amount,
        &expiry_ledger,
    );
    
    // Claim the escrow
    escrow_client.claim(&escrow_id, &recipient, &claim_secret);
    
    // Advance past expiry
    env.ledger().with_mut(|li| {
        li.sequence_number = expiry_ledger + 1;
    });
    
    // Try to refund already claimed escrow (should panic)
    escrow_client.refund(&escrow_id);
}
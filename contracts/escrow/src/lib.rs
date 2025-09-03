#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Symbol, Vec,
    log, BytesN
};

#[derive(Clone)]
#[contracttype]
pub struct EscrowData {
    pub sender: Address,
    pub recipient_hash: BytesN<32>,
    pub token: Address,
    pub amount: i128,
    pub expiry_ledger: u32,
    pub is_claimed: bool,
    pub is_refunded: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Escrow(BytesN<32>), // escrow_id
    Admin,
}

const ESCROW_CLAIMED: Symbol = Symbol::new(&soroban_sdk::Env::new(), "escrow_claimed");
const ESCROW_REFUNDED: Symbol = Symbol::new(&soroban_sdk::Env::new(), "escrow_refunded");
const ESCROW_CREATED: Symbol = Symbol::new(&soroban_sdk::Env::new(), "escrow_created");

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Create a new escrow
    /// Returns escrow_id
    pub fn create_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        sender: Address,
        recipient_hash: BytesN<32>,
        token: Address,
        amount: i128,
        expiry_ledger: u32,
    ) -> BytesN<32> {
        sender.require_auth();
        
        // Check if escrow already exists
        if env.storage().persistent().has(&DataKey::Escrow(escrow_id.clone())) {
            panic!("Escrow already exists");
        }

        // Transfer tokens from sender to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        // Store escrow data
        let escrow = EscrowData {
            sender,
            recipient_hash,
            token,
            amount,
            expiry_ledger,
            is_claimed: false,
            is_refunded: false,
        };
        
        env.storage().persistent().set(&DataKey::Escrow(escrow_id.clone()), &escrow);
        
        // Emit event
        env.events().publish((ESCROW_CREATED,), (escrow_id.clone(),));
        
        escrow_id
    }

    /// Claim escrow funds
    pub fn claim(
        env: Env,
        escrow_id: BytesN<32>,
        recipient: Address,
        claim_secret: BytesN<32>,
    ) {
        recipient.require_auth();
        
        // Get escrow data
        let mut escrow: EscrowData = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .unwrap_or_else(|| panic!("Escrow not found"));
        
        // Check if already claimed or refunded
        if escrow.is_claimed {
            panic!("Escrow already claimed");
        }
        if escrow.is_refunded {
            panic!("Escrow already refunded");
        }
        
        // Verify recipient hash matches
        let recipient_bytes = recipient.to_bytes();
        let secret_bytes = claim_secret.to_bytes();
        let mut hash_input = Vec::new(&env);
        for byte in recipient_bytes.iter() {
            hash_input.push_back(byte);
        }
        for byte in secret_bytes.iter() {
            hash_input.push_back(byte);
        }
        let computed_hash = env.crypto().sha256(&hash_input.to_bytes());
        
        if computed_hash != escrow.recipient_hash {
            panic!("Invalid recipient or secret");
        }
        
        // Transfer tokens to recipient
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &escrow.amount,
        );
        
        // Mark as claimed
        escrow.is_claimed = true;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id.clone()), &escrow);
        
        // Emit event
        env.events().publish(
            (ESCROW_CLAIMED,),
            (escrow_id, recipient, env.ledger().sequence()),
        );
    }

    /// Refund escrow to sender (only after expiry)
    pub fn refund(env: Env, escrow_id: BytesN<32>) {
        // Get escrow data
        let mut escrow: EscrowData = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .unwrap_or_else(|| panic!("Escrow not found"));
        
        // Sender can refund their own escrow
        escrow.sender.require_auth();
        
        // Check if already claimed or refunded
        if escrow.is_claimed {
            panic!("Escrow already claimed");
        }
        if escrow.is_refunded {
            panic!("Escrow already refunded");
        }
        
        // Check if expired
        if env.ledger().sequence() < escrow.expiry_ledger {
            panic!("Escrow not yet expired");
        }
        
        // Transfer tokens back to sender
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.sender.clone(),
            &escrow.amount,
        );
        
        // Mark as refunded
        escrow.is_refunded = true;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id.clone()), &escrow);
        
        // Emit event
        env.events().publish(
            (ESCROW_REFUNDED,),
            (escrow_id, escrow.sender, env.ledger().sequence()),
        );
    }

    /// Admin can force refund (emergency)
    pub fn admin_refund(env: Env, escrow_id: BytesN<32>) {
        // Check admin auth
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();
        
        // Get escrow data
        let mut escrow: EscrowData = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .unwrap_or_else(|| panic!("Escrow not found"));
        
        if escrow.is_claimed {
            panic!("Escrow already claimed");
        }
        if escrow.is_refunded {
            panic!("Escrow already refunded");
        }
        
        // Transfer tokens back to sender
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.sender.clone(),
            &escrow.amount,
        );
        
        // Mark as refunded
        escrow.is_refunded = true;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id.clone()), &escrow);
        
        // Emit event
        env.events().publish(
            (ESCROW_REFUNDED,),
            (escrow_id, escrow.sender, env.ledger().sequence()),
        );
    }

    /// Get escrow details
    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> EscrowData {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap_or_else(|| panic!("Escrow not found"))
    }
}
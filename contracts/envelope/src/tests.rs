#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{contract, contractimpl, contracttype, symbol, vec, Address, BytesN, Env, Symbol};

#[contract]
pub struct MockToken;

#[contracttype]
#[derive(Clone)]
enum TKey {
    Admin,
    Bal(Address),
}

#[contractimpl]
impl MockToken {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&TKey::Admin, &admin);
    }
    pub fn mint(env: Env, to: Address, amount: i128) {
        let b = Self::balance(env.clone(), to.clone());
        env.storage().instance().set(&TKey::Bal(to), &(b + amount));
    }
    pub fn balance(env: Env, who: Address) -> i128 {
        env.storage()
            .instance()
            .get::<TKey, i128>(&TKey::Bal(who))
            .unwrap_or(0)
    }
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let bf = Self::balance(env.clone(), from.clone());
        assert!(bf >= amount, "insufficient");
        let bt = Self::balance(env.clone(), to.clone());
        env.storage().instance().set(&TKey::Bal(from), &(bf - amount));
        env.storage().instance().set(&TKey::Bal(to), &(bt + amount));
    }
}

#[soroban_sdk::contractclient(name = "MockTokenClient")]
trait MockTokenIface {
    fn init(e: Env, admin: Address);
    fn mint(e: Env, to: Address, amount: i128);
    fn balance(e: Env, who: Address) -> i128;
    fn transfer(e: Env, from: Address, to: Address, amount: i128);
}

#[contract]
pub struct MockReflectorFx;

#[contracttype]
#[derive(Clone)]
enum RKey {
    Last,
    AtTs(u64),
}

#[contractimpl]
impl MockReflectorFx {
    pub fn set_last(env: Env, price: i128, scale: i128, ts: u64) {
        env.storage().instance().set(&RKey::Last, &(price, scale, ts));
    }
    pub fn set_at(env: Env, ts: u64, price: i128, scale: i128) {
        env.storage().instance().set(&RKey::AtTs(ts), &(price, scale, ts));
    }
    pub fn lastprice(env: Env, _symbol: Symbol) -> (i128, i128, u64) {
        env.storage()
            .instance()
            .get::<RKey, (i128, i128, u64)>(&RKey::Last)
            .expect("last not set")
    }
    pub fn price(env: Env, _symbol: Symbol, ts: u64) -> (i128, i128, u64) {
        env.storage()
            .instance()
            .get::<RKey, (i128, i128, u64)>(&RKey::AtTs(ts))
            .expect("price at ts not set")
    }
}

#[soroban_sdk::contractclient(name = "ReflectorClient")]
trait MockReflectorIface {
    fn set_last(e: Env, price: i128, scale: i128, ts: u64);
    fn set_at(e: Env, ts: u64, price: i128, scale: i128);
    fn lastprice(e: Env, symbol: Symbol) -> (i128, i128, u64);
    fn price(e: Env, symbol: Symbol, ts: u64) -> (i128, i128, u64);
}

#[soroban_sdk::contractclient(name = "EnvelopeClient")]
trait EnvelopeIface {
    fn init(e: Env, reflector_fx: Address);
    fn create_envelope(
        e: Env,
        creator: Address,
        recipient: Address,
        asset: Address,
        amount_in: i128,
        denom: Symbol,
        expiry_secs: u64,
    ) -> u64;
    fn open_envelope(e: Env, recipient: Address, id: u64) -> i128;
    fn refund_after_expiry(e: Env, creator: Address, id: u64);
}

fn addr_of(env: &Env, id: &BytesN<32>) -> Address {
    Address::from_contract_id(id)
}

#[test]
fn create_and_open_happy_path() {
    let env = Env::default();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);

    let token_id = env.register_contract(None, MockToken);
    let token = MockTokenClient::new(&env, &addr_of(&env, &token_id));

    let refl_id = env.register_contract(None, MockReflectorFx);
    let reflector_addr = addr_of(&env, &refl_id);
    let refl = ReflectorClient::new(&env, &reflector_addr);

    let envlp_id = env.register_contract(None, Envelope);
    let envlp = EnvelopeClient::new(&env, &addr_of(&env, &envlp_id));

    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    token.init(&creator);
    token.mint(&creator, &1_000_000);
    let now = env.ledger().timestamp();
    refl.set_last(&100_000_000, &100_000_000, &now);
    refl.set_at(&now, &100_000_000, &100_000_000);

    envlp.init(&reflector_addr);

    let id = envlp.create_envelope(
        &creator,
        &recipient,
        &addr_of(&env, &token_id),
        &250_000,
        &symbol!("USD"),
        &0,
    );
    assert_eq!(id, 1);

    let contract_addr = Address::from_contract_id(&envlp_id);
    assert_eq!(token.balance(&creator), 750_000);
    assert_eq!(token.balance(&contract_addr), 250_000);

    let usd = envlp.open_envelope(&recipient, &id);
    assert_eq!(usd, 250_000);

    assert_eq!(token.balance(&contract_addr), 0);
    assert_eq!(token.balance(&recipient), 250_000);
}

#[test]
fn stale_price_rejected() {
    let env = Env::default();
    env.ledger().with_mut(|l| l.timestamp = 2_000);

    let token_id = env.register_contract(None, MockToken);
    let token = MockTokenClient::new(&env, &addr_of(&env, &token_id));

    let refl_id = env.register_contract(None, MockReflectorFx);
    let reflector_addr = addr_of(&env, &refl_id);
    let refl = ReflectorClient::new(&env, &reflector_addr);

    let envlp_id = env.register_contract(None, Envelope);
    let envlp = EnvelopeClient::new(&env, &addr_of(&env, &envlp_id));

    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    token.init(&creator);
    token.mint(&creator, &10);

    refl.set_last(&100, &100, &(env.ledger().timestamp() - 120));
    envlp.init(&reflector_addr);

    let res = std::panic::catch_unwind(|| {
        let _ = envlp.create_envelope(
            &creator,
            &recipient,
            &addr_of(&env, &token_id),
            &10,
            &symbol!("USD"),
            &0,
        );
    });
    assert!(res.is_err(), "expected stale price panic");
}

#[test]
fn double_open_fails_and_refund_after_expiry_works() {
    let env = Env::default();
    env.ledger().with_mut(|l| l.timestamp = 10_000);

    let token_id = env.register_contract(None, MockToken);
    let token = MockTokenClient::new(&env, &addr_of(&env, &token_id));

    let refl_id = env.register_contract(None, MockReflectorFx);
    let reflector_addr = addr_of(&env, &refl_id);
    let refl = ReflectorClient::new(&env, &reflector_addr);

    let envlp_id = env.register_contract(None, Envelope);
    let envlp = EnvelopeClient::new(&env, &addr_of(&env, &envlp_id));

    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    token.init(&creator);
    token.mint(&creator, &500);

    let now = env.ledger().timestamp();
    refl.set_last(&200_000_000, &100_000_000, &now);
    refl.set_at(&now, &200_000_000, &100_000_000);

    envlp.init(&reflector_addr);
    let id = envlp.create_envelope(
        &creator,
        &recipient,
        &addr_of(&env, &token_id),
        &100,
        &symbol!("USD"),
        &30,
    );

    let usd = envlp.open_envelope(&recipient, &id);
    assert_eq!(usd, 200);

    let again = std::panic::catch_unwind(|| envlp.open_envelope(&recipient, &id));
    assert!(again.is_err(), "double open must fail");

    let id2 = envlp.create_envelope(
        &creator,
        &recipient,
        &addr_of(&env, &token_id),
        &50,
        &symbol!("USD"),
        &10,
    );
    env.ledger().with_mut(|l| l.timestamp += 11);
    envlp.refund_after_expiry(&creator, &id2);

    let contract_addr = Address::from_contract_id(&envlp_id);
    assert_eq!(token.balance(&contract_addr), 0, "refund emptied escrow");
}
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, symbol, Address, Env, Symbol,
};
mod reflector;
use reflector::{last_usd, usd_at, FxPrice};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextId,
    Envelope(u64),
    ReflectorFx,
}

#[derive(Clone)]
#[contracttype]
pub struct EnvelopeData {
    pub id: u64,
    pub creator: Address,
    pub recipient: Address,
    pub asset: Address,
    pub amount_in: i128,
    pub created_ts: u64,
    pub denom: Symbol,
    pub opened: bool,
    pub expiry_ts: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct EnvelopeCreated {
    pub id: u64,
    pub creator: Address,
    pub recipient: Address,
    pub asset: Address,
    pub amount_in: i128,
    pub ts: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct EnvelopeOpened {
    pub id: u64,
    pub usd_amount: i128,
    pub ts: u64,
}

#[derive(Copy, Clone, Debug)]
#[repr(u32)]
pub enum Err {
    NotFound = 1,
    AlreadyOpened = 2,
    AmountZero = 3,
    PriceStale = 4,
    NotRecipient = 5,
    Expired = 6,
}

fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}

fn mul_div(a: i128, b: i128, scale: i128) -> i128 {
    let prod = a.checked_mul(b).expect("mul overflow");
    prod.checked_div(scale).expect("div overflow/zero")
}

#[contract]
pub struct Envelope;

#[contractimpl]
impl Envelope {
    pub fn init(env: Env, reflector_fx: Address) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "reflector_fx"), &reflector_fx);
        env.storage().instance().set(&DataKey::NextId, &0u64);
    }

    pub fn create_envelope(
        env: Env,
        creator: Address,
        recipient: Address,
        asset: Address,
        amount_in: i128,
        denom: Symbol,
        expiry_secs: u64,
    ) -> u64 {
        if amount_in <= 0 {
            panic_with_error!(&env, Err::AmountZero);
        }
        creator.require_auth();

        let FxPrice { ts: last_ts, .. } = last_usd(&env);
        let cur = now(&env);
        if cur.saturating_sub(last_ts) > 60 {
            panic_with_error!(&env, Err::PriceStale);
        }

        TokenClient::new(&env, &asset).transfer(&creator, &env.current_contract_address(), &amount_in);

        let mut id = env.storage().instance().get::<DataKey, u64>(&DataKey::NextId).unwrap_or(0);
        id += 1;
        env.storage().instance().set(&DataKey::NextId, &id);

        let created_ts = cur;
        let expiry_ts = if expiry_secs == 0 { 0 } else { created_ts.saturating_add(expiry_secs) };

        let data = EnvelopeData {
            id,
            creator: creator.clone(),
            recipient: recipient.clone(),
            asset: asset.clone(),
            amount_in,
            created_ts,
            denom,
            opened: false,
            expiry_ts,
        };
        env.storage().persistent().set(&DataKey::Envelope(id), &data);

        env.events().publish(
            (Symbol::new(&env, "EnvelopeCreated"),),
            EnvelopeCreated {
                id,
                creator,
                recipient,
                asset,
                amount_in,
                ts: created_ts,
            },
        );

        id
    }

    pub fn open_envelope(env: Env, recipient: Address, id: u64) -> i128 {
        recipient.require_auth();

        let mut data: EnvelopeData = env
            .storage()
            .persistent()
            .get(&DataKey::Envelope(id))
            .unwrap_or_else(|| panic_with_error!(&env, Err::NotFound));

        if data.opened {
            panic_with_error!(&env, Err::AlreadyOpened);
        }
        if data.recipient != recipient {
            panic_with_error!(&env, Err::NotRecipient);
        }
        if data.expiry_ts != 0 && now(&env) > data.expiry_ts {
            panic_with_error!(&env, Err::Expired);
        }

        let FxPrice { price, scale, .. } = usd_at(&env, data.created_ts);
        let usd_amount = mul_div(data.amount_in, price, scale);

        TokenClient::new(&env, &data.asset).transfer(&env.current_contract_address(), &recipient, &data.amount_in);

        data.opened = true;
        env.storage().persistent().set(&DataKey::Envelope(id), &data);

        env.events().publish(
            (Symbol::new(&env, "EnvelopeOpened"),),
            EnvelopeOpened {
                id,
                usd_amount,
                ts: now(&env),
            },
        );

        usd_amount
    }

    pub fn refund_after_expiry(env: Env, creator: Address, id: u64) {
        creator.require_auth();

        let mut data: EnvelopeData = env
            .storage()
            .persistent()
            .get(&DataKey::Envelope(id))
            .unwrap_or_else(|| panic_with_error!(&env, Err::NotFound));

        if data.creator != creator {
            panic_with_error!(&env, Err::NotRecipient);
        }
        if data.opened {
            panic_with_error!(&env, Err::AlreadyOpened);
        }
        if data.expiry_ts == 0 || now(&env) <= data.expiry_ts {
            panic_with_error!(&env, Err::Expired);
        }

        TokenClient::new(&env, &data.asset).transfer(&env.current_contract_address(), &creator, &data.amount_in);
        data.opened = true;
        env.storage().persistent().set(&DataKey::Envelope(id), &data);
    }
}

use soroban_sdk::contractclient;
#[contractclient(name = "TokenClient")]
pub trait TokenTrait {
    fn transfer(e: Env, from: Address, to: Address, amount: i128);
}

#[cfg(test)]
mod tests;
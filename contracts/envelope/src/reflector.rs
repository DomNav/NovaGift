use soroban_sdk::{contractclient, symbol, Address, Env, Symbol};

#[derive(Clone, Debug)]
pub struct FxPrice {
    pub price: i128,
    pub scale: i128,
    pub ts: u64,
}

#[contractclient(name = "ReflectorFxClient")]
pub trait ReflectorFx {
    fn lastprice(e: Env, symbol: Symbol) -> (i128, i128, u64);
    fn price(e: Env, symbol: Symbol, ts: u64) -> (i128, i128, u64);
}

pub fn get_fx_addr(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<Symbol, Address>(&symbol!("reflector_fx"))
        .expect("reflector fx not configured (call init)")
}

pub fn last_usd(env: &Env) -> FxPrice {
    let (p, s, t) = ReflectorFxClient::new(env, &get_fx_addr(env)).lastprice(&symbol!("USD"));
    FxPrice { price: p, scale: s, ts: t }
}

pub fn usd_at(env: &Env, ts: u64) -> FxPrice {
    let (p, s, t) = ReflectorFxClient::new(env, &get_fx_addr(env)).price(&symbol!("USD"), &ts);
    FxPrice { price: p, scale: s, ts: t }
}
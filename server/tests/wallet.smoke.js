"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const API_BASE = process.env.API_BASE || "http://localhost:4000";
const FRIENDBOT = "https://friendbot.stellar.org";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitServer() {
    for (let i = 0; i < 10; i++) {
        try {
            await axios_1.default.get(`${API_BASE}/api/health`, { timeout: 1500 });
            return;
        }
        catch {
            await sleep(500);
        }
    }
    throw new Error("Server not reachable");
}
(async () => {
    await waitServer();
    const kp = stellar_sdk_1.Keypair.random();
    const pub = kp.publicKey();
    await axios_1.default.get(`${FRIENDBOT}/?addr=${encodeURIComponent(pub)}`, { timeout: 10000 });
    const resp = await axios_1.default.get(`${API_BASE}/api/wallet/balances/${pub}`, { timeout: 5000 });
    if (!resp.data?.ok)
        throw new Error("balances endpoint not ok");
    const xlm = Number(resp.data.xlm);
    if (!Number.isFinite(xlm) || xlm <= 0)
        throw new Error("no XLM balance");
    const hasXLM = Array.isArray(resp.data.balances) && resp.data.balances.some((b) => b?.code === "XLM");
    if (!hasXLM)
        throw new Error("XLM missing");
    console.log("✅ Wallet balances smoke OK:", { account: pub, xlm: resp.data.xlm });
})().catch(e => { console.error("❌ Wallet balances smoke FAIL:", e?.message || e); process.exit(1); });

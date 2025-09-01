"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_BASE = process.env.API_BASE || "http://localhost:4000";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
    for (let i = 0; i < 10; i++) {
        try {
            await axios_1.default.get(`${API_BASE}/api/health`, { timeout: 1500 });
            break;
        }
        catch {
            await sleep(500);
        }
    }
    const r = await axios_1.default.get(`${API_BASE}/api/rates/spot?base=XLM&quote=USD`, { timeout: 5000 });
    if (!r.data?.ok)
        throw new Error("rates endpoint not ok");
    const price = Number(r.data.price);
    if (!Number.isFinite(price) || price <= 0)
        throw new Error("invalid price");
    console.log("✅ Rates smoke OK:", { base: r.data.base, quote: r.data.quote, price });
})().catch(e => { console.error("❌ Rates smoke FAIL:", e?.message || e); process.exit(1); });

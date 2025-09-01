"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock("../src/lib/soroban-kale", () => ({
    getKaleHoldings: vitest_1.vi.fn(async () => 7)
}));
const soroban_kale_1 = require("../src/lib/soroban-kale");
const skins_1 = require("../src/config/skins");
(0, vitest_1.describe)("KALE eligibility logic", () => {
    (0, vitest_1.it)("eligible when holdings >= threshold", async () => {
        const have = await (0, soroban_kale_1.getKaleHoldings)("G...USER...");
        (0, vitest_1.expect)(have).toBe(7);
        (0, vitest_1.expect)(have >= skins_1.SKIN_RULES["wrapper.aurora-glass"].threshold).toBe(true);
    });
});

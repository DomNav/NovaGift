import { describe, it, expect, vi } from "vitest";
vi.mock("../src/lib/soroban-kale", () => ({ 
  getKaleHoldings: vi.fn(async () => 7) 
}));
import { getKaleHoldings } from "../src/lib/soroban-kale";
import { SKIN_RULES } from "../src/config/skins";

describe("KALE eligibility logic", () => {
  it("eligible when holdings >= threshold", async () => {
    const have = await getKaleHoldings("G...USER...");
    expect(have).toBe(7);
    expect(have >= SKIN_RULES["wrapper.aurora-glass"].threshold).toBe(true);
  });
});
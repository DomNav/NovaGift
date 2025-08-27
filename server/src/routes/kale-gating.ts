import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getKaleHoldings } from "../lib/soroban-kale";
import { prisma } from "../db/client";
import { SKIN_RULES } from "../config/skins";

const router = Router();

// Public endpoint for checking KALE balance (no auth required)
router.get("/balance/:publicKey", async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    
    if (!publicKey || publicKey.length < 50) {
      return res.status(400).json({ error: "invalid_public_key" });
    }
    
    const holdings = await getKaleHoldings(publicKey);
    res.json({ 
      ok: true,
      publicKey,
      holdings,
      unlocked: holdings >= 2000 // Special edition skin threshold
    });
  } catch (error) {
    console.error("KALE balance check error:", error);
    res.status(500).json({ error: "balance_check_failed" });
  }
});

// Protected routes below this line require authentication
router.use(requireAuth);

router.get("/eligibility", async (req: Request, res: Response) => {
  try {
    const publicKey = (req as any).wallet.publicKey as string;
    const holdings = await getKaleHoldings(publicKey);
    const eligible = Object.fromEntries(
      Object.entries(SKIN_RULES).map(([id, r]) => [id, holdings >= r.threshold])
    );
    res.json({ holdings, eligible, rules: SKIN_RULES });
  } catch (error) {
    console.error("Eligibility check error:", error);
    res.status(500).json({ error: "eligibility_check_failed" });
  }
});

const RedeemBody = z.object({ skinId: z.string() });

router.post("/redeem-kale-gated", async (req: Request, res: Response) => {
  try {
    const parsed = RedeemBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });
    const publicKey = (req as any).wallet.publicKey as string;

    const rule = SKIN_RULES[parsed.data.skinId];
    if (!rule) return res.status(400).json({ error: "unknown_skin" });

    const holdings = await getKaleHoldings(publicKey);
    if (holdings < rule.threshold)
      return res.status(403).json({ 
        error: "not_eligible", 
        needed: rule.threshold, 
        have: holdings 
      });

    const user = await prisma.user.upsert({ 
      where: { publicKey }, 
      create: { publicKey }, 
      update: {} 
    });
    
    await prisma.userSkin.upsert({
      where: { userId_skinId: { userId: user.id, skinId: parsed.data.skinId } },
      update: {},
      create: { userId: user.id, skinId: parsed.data.skinId, source: "KALE_GATED" },
    });

    res.json({ ok: true, skinId: parsed.data.skinId });
  } catch (error) {
    console.error("Redeem error:", error);
    res.status(500).json({ error: "redeem_failed" });
  }
});

export default router;
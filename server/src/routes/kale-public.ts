import { Router, Request, Response } from "express";
import { getKaleHoldings } from "../lib/soroban-kale";

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

export default router;

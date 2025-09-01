import { Router } from "express";
import { z } from "zod";
import { buildXlmTransferXDR } from "../lib/stellar-xlm";

const router = Router();

const G = z.string().trim().toUpperCase().startsWith("G");
const Amount7 = z.string().trim().regex(/^\d+(\.\d{1,7})?$/, "amount must be a string with up to 7 decimals");

const Body = z.object({
  sourcePublicKey: G,
  destination: G,
  amount: Amount7,
  memo: z.string().trim().max(28).optional(),
});

// NOTE: relative to the mount prefix in server.ts
router.post("/build-xlm-payment", async (req, res, next) => {
  try {
    const { sourcePublicKey, destination, amount, memo } = Body.parse(req.body);
    const x = await buildXlmTransferXDR({ sourcePublicKey, destination, amount, memo });
    res.json(x);
  } catch (e) {
    next(e);
  }
});

export default router;
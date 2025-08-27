import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getServerAccountId, issueChallenge, verifySignedChallenge } from "../lib/sep10";
import { mintSession } from "../lib/jwt";

const r = Router();
const ChallengeBody = z.object({ account: z.string() });
const VerifyBody = z.object({ signedXDR: z.string() });

r.post("/sep10/challenge", (req: Request, res: Response) => {
  try {
    const parsed = ChallengeBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });
    const nonce = randomBytes(16).toString("hex");
    const payload = issueChallenge({ account: parsed.data.account, nonce, timeoutSec: 300 });
    res.json(payload);
  } catch (error) {
    console.error("Challenge error:", error);
    res.status(500).json({ error: "challenge_failed" });
  }
});

r.post("/sep10/verify", (req: Request, res: Response) => {
  try {
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });
    const { sub } = verifySignedChallenge(parsed.data.signedXDR);
    const token = mintSession(sub);
    res.json({ token, sub, server: getServerAccountId() });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(400).json({ error: "verification_failed" });
  }
});

export default r;
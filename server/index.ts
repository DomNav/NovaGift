import express from "express";
import crypto from "crypto";
import { Resend } from "resend";
import { ClaimEmail } from "./templates/ClaimEmail";

const app = express();
app.use(express.json());

const RESEND_KEY = process.env.RESEND_API_KEY!;
const MAIL_FROM = process.env.MAIL_FROM || "Soroseal <no-reply@soroseal.app>";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5174";
const HMAC_SECRET = process.env.WEBHOOK_SECRET!;

const resend = new Resend(RESEND_KEY);

// simple HMAC check
function verifySig(req: express.Request) {
  const sig = req.header("x-soro-signature") || "";
  const body = JSON.stringify(req.body);
  const h = crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
}

// Idempotency cache (in-mem for hackathon)
const sent = new Set<string>(); // `${envelopeId}:${email}`

app.post("/notify/envelope-funded", async (req, res) => {
  try {
    if (!verifySig(req)) return res.status(401).json({ error: "bad signature" });
    const { envelopeId, recipientEmail, amountUsd, skinId } = req.body as {
      envelopeId: string; recipientEmail: string; amountUsd: number; skinId?: string;
    };
    if (!recipientEmail || !envelopeId) return res.status(400).json({ error: "missing fields" });
    const key = `${envelopeId}:${recipientEmail.toLowerCase()}`;
    if (sent.has(key)) return res.status(200).json({ ok: true, idempotent: true });

    // Create simple JWT-like token (not for prod)
    const token = crypto.randomBytes(16).toString("hex");
    const claimUrl = `${APP_BASE_URL}/open?e=${encodeURIComponent(envelopeId)}&t=${token}`;

    await resend.emails.send({
      from: MAIL_FROM,
      to: recipientEmail,
      subject: "You've received a Soroseal gift 🎁",
      react: ClaimEmail({ amountUsd, claimUrl, skinId }),
    });

    sent.add(key);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "send_failed" });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log("notify server on", process.env.PORT || 4000);
});
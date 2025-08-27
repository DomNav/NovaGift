import "dotenv/config";
import express from "express";
import cors from "cors";
import { openDB, ensureSchema } from "./db";
import type { Request, Response } from "express";
import { Resend } from "resend";

const PORT = Number(process.env.PORT || 4000);
const DB_PATH = process.env.DATABASE_PATH || "./data/app.db";
const resendKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.FROM_EMAIL || "noreply@novagift.app";

const db = openDB(DB_PATH);
ensureSchema(db);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/studio/me", (req, res) => {
  const wallet = String(req.query.wallet || "");
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  const row =
    db
      .prepare("SELECT wallet, km, usd_earned FROM profiles WHERE wallet=?")
      .get(wallet) || { wallet, km: 0, usd_earned: 0 };

  res.json(row);
});

app.post("/api/km/award", (req: Request, res: Response) => {
  const { wallet, deltaKm = 0, deltaUsd = 0 } = req.body || {};
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  const tx = db.transaction((w: string, k: number, u: number) => {
    db.prepare(
      "INSERT INTO profiles(wallet, km, usd_earned) VALUES(?, ?, ?) ON CONFLICT(wallet) DO UPDATE SET km=km+excluded.km, usd_earned=usd_earned+excluded.usd_earned"
    ).run(w, k, u);
    db.prepare("INSERT INTO events(type, payload) VALUES(?, ?)").run(
      "km_award",
      JSON.stringify({ wallet: w, deltaKm: k, deltaUsd: u })
    );
  });
  tx(wallet, Number(deltaKm), Number(deltaUsd));
  res.json({ ok: true });
});

app.post("/hooks/reflector", async (req, res) => {
  db.prepare("INSERT INTO events(type, payload) VALUES(?, ?)").run(
    "reflector_hook",
    JSON.stringify(req.body)
  );

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromEmail,
        to: [fromEmail],
        subject: "NovaGift: Reflector event",
        text: JSON.stringify(req.body, null, 2),
      });
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`NovaGift server listening on :${PORT}`);
});
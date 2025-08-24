import express from "express";
import crypto from "crypto";
import cors from "cors";
import { Resend } from "resend";
import Database from "better-sqlite3";
import { ClaimEmail } from "./templates/ClaimEmail";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "NovaGift <no-reply@novagift.app>";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5174";
const HMAC_SECRET = process.env.WEBHOOK_SECRET || "dev-secret";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

const dbPath = path.join(__dirname, "../novagift.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE NOT NULL,
    km INTEGER DEFAULT 0,
    total_usd INTEGER DEFAULT 0,
    unlocked_skins TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS envelopes (
    id TEXT PRIMARY KEY,
    creator_address TEXT NOT NULL,
    recipient_address TEXT,
    amount_usd INTEGER DEFAULT 0,
    status TEXT DEFAULT 'created',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    opened_at DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    action TEXT NOT NULL,
    envelope_id TEXT,
    km_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function verifySig(req: express.Request) {
  const sig = req.header("x-soro-signature") || "";
  const body = JSON.stringify(req.body);
  const h = crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
}

const sent = new Set<string>();

app.get("/api/studio/me", (req, res) => {
  const address = req.query.address as string;
  
  if (!address) {
    return res.json({ km: 0, unlockedSkins: [] });
  }
  
  const stmt = db.prepare(`
    SELECT km, unlocked_skins FROM users WHERE address = ?
  `);
  
  const user = stmt.get(address) as any;
  
  if (!user) {
    const insertStmt = db.prepare(`
      INSERT INTO users (address, km, unlocked_skins) VALUES (?, 0, '[]')
    `);
    insertStmt.run(address);
    return res.json({ km: 0, unlockedSkins: [] });
  }
  
  return res.json({
    km: user.km,
    unlockedSkins: JSON.parse(user.unlocked_skins)
  });
});

app.post("/api/km/award", (req, res) => {
  const { address, deltaKm, deltaUsd, action, envelopeId } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: "Address required" });
  }
  
  const getUserStmt = db.prepare(`
    SELECT km, total_usd FROM users WHERE address = ?
  `);
  
  let user = getUserStmt.get(address) as any;
  
  if (!user) {
    const insertStmt = db.prepare(`
      INSERT INTO users (address, km, total_usd, unlocked_skins) 
      VALUES (?, 0, 0, '[]')
    `);
    insertStmt.run(address);
    user = { km: 0, total_usd: 0 };
  }
  
  const newKm = user.km + (deltaKm || 0);
  const newUsd = user.total_usd + (deltaUsd || 0);
  
  const updateStmt = db.prepare(`
    UPDATE users SET km = ?, total_usd = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE address = ?
  `);
  updateStmt.run(newKm, newUsd, address);
  
  if (action) {
    const activityStmt = db.prepare(`
      INSERT INTO activity (user_address, action, envelope_id, km_earned)
      VALUES (?, ?, ?, ?)
    `);
    activityStmt.run(address, action, envelopeId || null, deltaKm || 0);
  }
  
  return res.json({ 
    km: newKm, 
    totalUsd: newUsd,
    message: `Awarded ${deltaKm} KM` 
  });
});

app.get("/api/envelopes/:id", (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare(`
    SELECT * FROM envelopes WHERE id = ?
  `);
  
  const envelope = stmt.get(id);
  
  if (!envelope) {
    return res.status(404).json({ error: "Envelope not found" });
  }
  
  return res.json(envelope);
});

app.post("/api/envelopes", (req, res) => {
  const { id, creatorAddress, recipientAddress, amountUsd } = req.body;
  
  if (!id || !creatorAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const stmt = db.prepare(`
    INSERT INTO envelopes (id, creator_address, recipient_address, amount_usd)
    VALUES (?, ?, ?, ?)
  `);
  
  try {
    stmt.run(id, creatorAddress, recipientAddress || null, amountUsd || 0);
    return res.json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create envelope record" });
  }
});

app.post("/api/envelopes/:id/open", (req, res) => {
  const { id } = req.params;
  const { recipientAddress, amountUsd } = req.body;
  
  const stmt = db.prepare(`
    UPDATE envelopes 
    SET status = 'opened', 
        opened_at = CURRENT_TIMESTAMP,
        recipient_address = ?,
        amount_usd = ?
    WHERE id = ?
  `);
  
  stmt.run(recipientAddress, amountUsd, id);
  
  return res.json({ success: true });
});

app.post("/hooks/reflector", (req, res) => {
  console.log("Reflector webhook:", req.body);
  
  return res.json({ ok: true });
});

app.post("/notify/envelope-funded", async (req, res) => {
  try {
    if (HMAC_SECRET !== "dev-secret" && !verifySig(req)) {
      return res.status(401).json({ error: "bad signature" });
    }
    
    const { envelopeId, recipientEmail, amountUsd, skinId } = req.body as {
      envelopeId: string; recipientEmail: string; amountUsd: number; skinId?: string;
    };
    
    if (!recipientEmail || !envelopeId) {
      return res.status(400).json({ error: "missing fields" });
    }
    
    const key = `${envelopeId}:${recipientEmail.toLowerCase()}`;
    if (sent.has(key)) {
      return res.status(200).json({ ok: true, idempotent: true });
    }
    
    const token = crypto.randomBytes(16).toString("hex");
    const claimUrl = `${APP_BASE_URL}/open?e=${encodeURIComponent(envelopeId)}&t=${token}`;
    
    if (resend && RESEND_KEY) {
      await resend.emails.send({
        from: MAIL_FROM,
        to: recipientEmail,
        subject: "You've received a NovaGift gift 🎁",
        react: ClaimEmail({ amountUsd, claimUrl, skinId }),
      });
    } else {
      console.log("Email would be sent to:", recipientEmail);
      console.log("Claim URL:", claimUrl);
    }
    
    sent.add(key);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "send_failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`NovaGift server running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
});
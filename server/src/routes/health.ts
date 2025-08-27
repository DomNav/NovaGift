import { Router } from "express";
import { prisma } from "../db/client";

const r = Router();

async function pingJson(url: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) await res.json(); else await res.text();
    return true;
  } catch { return false; }
}

r.get("/", async (_req, res) => {
  const started = Date.now();
  const db = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const horizon = process.env.HORIZON_URL ? await pingJson(process.env.HORIZON_URL) : false;
  const rpc = process.env.SOROBAN_RPC_URL ? await pingJson(`${process.env.SOROBAN_RPC_URL!.replace(/\/$/,"")}/info`) : false;

  res.json({
    ok: db && horizon && rpc,
    services: { api: true, db, horizon, rpc },
    elapsed_ms: Date.now() - started,
    ts: new Date().toISOString(),
  });
});

export default r;
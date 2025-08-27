import type { Request, Response, NextFunction } from "express";
import { verifySession } from "../lib/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) return res.status(401).json({ error: "missing_token" });
  try {
    const { sub } = verifySession(m[1]);
    (req as any).wallet = { publicKey: sub };
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "default-dev-secret";
const EXPIRES = process.env.JWT_EXPIRES_IN ?? "900s";

export function mintSession(sub: string) {
  return jwt.sign({ sub }, SECRET, { expiresIn: EXPIRES });
}

export function verifySession(token: string): { sub: string } {
  const decoded = jwt.verify(token, SECRET) as { sub: string };
  return { sub: decoded.sub };
}
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export interface ClaimTokenPayload {
  envelopeId: string;
  email: string;
}

export function signClaimToken(payload: ClaimTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d"
  } as jwt.SignOptions);
}

export function verifyClaimToken(token: string): ClaimTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as ClaimTokenPayload;
  return decoded;
}

export default {
  signClaimToken,
  verifyClaimToken
};
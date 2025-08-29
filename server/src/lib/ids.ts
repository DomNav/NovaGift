import { randomBytes } from "crypto";

/**
 * Base32 character set (excludes 0, 1, I, O for clarity)
 */
const BASE32_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a short, unique code using base32 encoding
 * @param length - Length of the code (default: 8)
 * @returns A short base32 code
 */
export function shortCode(length: number = 8): string {
  const bytes = randomBytes(Math.ceil(length * 5 / 8)); // base32 needs 5 bits per character
  let result = "";
  
  for (let i = 0; i < length; i++) {
    const index = bytes[Math.floor(i * 5 / 8)] >> ((i * 5) % 8) & 0x1f;
    result += BASE32_CHARS[index % BASE32_CHARS.length];
  }
  
  return result;
}

/**
 * Converts atomic amount (7 decimal places) to human readable
 * @param atomic - Amount in atomic units (BigInt)
 * @returns Human readable amount string
 */
export function fromAtomic(atomic: BigInt): string {
  const divisor = BigInt(10000000); // 10^7
  const whole = atomic / divisor;
  const fraction = atomic % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  return `${whole}.${fraction.toString().padStart(7, "0").replace(/0+$/, "")}`;
}

/**
 * Converts human readable amount to atomic units (7 decimal places)
 * @param amount - Human readable amount string
 * @returns Amount in atomic units (BigInt)
 */
export function toAtomic(amount: string): BigInt {
  const [whole, fraction = "0"] = amount.split(".");
  const paddedFraction = fraction.padEnd(7, "0").slice(0, 7);
  return BigInt(whole) * BigInt(10000000) + BigInt(paddedFraction);
}

import { z } from "zod";

export const StellarG = z.string().regex(/^G[A-Z2-7]{55}$/, "invalid Stellar public key");
export const ContactUpsert = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  wallet: z.string().trim().optional().refine(v => !v || /^G[A-Z2-7]{55}$/.test(v), "invalid Stellar public key"),
  tags: z.array(z.string().trim().min(1)).default([]),
});
export type ContactUpsert = z.infer<typeof ContactUpsert>;

export const ContactQuery = z.object({
  q: z.string().trim().default(""),
  tag: z.string().trim().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

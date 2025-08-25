import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url(),

  HORIZON_URL: z.string().url(),
  SOROBAN_RPC_URL: z.string().url(),
  NETWORK_PASSPHRASE: z.string().min(3),

  NOVAGIFT_CONTRACT_ID: z.string().optional().default(''),
  ENABLE_REFLECTOR: z.string().optional().default('false'),

  LINK_SIGNING_KEY: z.string().optional().default(''),
  FEE_SPONSOR: z.string().optional().default(''),

  DATABASE_URL: z.string(),
  POOLING: z.string().optional().default('false'),

  RESEND_API_KEY: z.string().optional().default(''),
});

export const env = Env.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
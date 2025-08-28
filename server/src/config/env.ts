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
  DIRECT_URL: z.string().optional(),
  POOLING: z.string().optional().default('false'),

  RESEND_API_KEY: z.string().optional().default(''),
  
  // KALE Token
  KALE_CONTRACT_ID: z.string().default(''),
  KALE_FAKE_BALANCE: z.coerce.boolean().default(false),
  
  // SEP-10 / Web Auth
  WEB_AUTH_HOME_DOMAIN: z.string(),
  WEB_AUTH_DOMAIN: z.string(),
  WEB_AUTH_SERVER_SECRET: z.string().optional().default(''), // Stellar secret seed
  
  // Sessions
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('900s'),
  
  // Passkey support (optional, required when ENABLE_PASSKEYS=true)
  ENABLE_PASSKEYS: z.coerce.boolean().default(false),
  STELLAR_RPC_URL: z.string().url().optional(),
  PASSKEY_FACTORY_ID: z.string().optional(),
  MERCURY_URL: z.string().url().optional(),
  MERCURY_JWT: z.string().optional(),
  LAUNCHTUBE_URL: z.string().url().optional(),
  LAUNCHTUBE_JWT: z.string().optional(),
});

// Parse base environment
const baseEnv = Env.parse(process.env);

// Additional validation when passkeys are enabled
if (baseEnv.ENABLE_PASSKEYS) {
  const requiredPasskeyVars = [
    'STELLAR_RPC_URL',
    'NETWORK_PASSPHRASE', 
    'PASSKEY_FACTORY_ID',
    'MERCURY_URL',
    'MERCURY_JWT',
    'LAUNCHTUBE_URL', 
    'LAUNCHTUBE_JWT'
  ];
  
  const missing = requiredPasskeyVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`ENABLE_PASSKEYS=true but missing required vars: ${missing.join(', ')}`);
  }
}

export const env = baseEnv;
export const isProd = env.NODE_ENV === 'production';
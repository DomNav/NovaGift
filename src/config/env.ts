/**
 * Environment configuration for the NovaGift frontend
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

export const API_URL = import.meta.env.VITE_API_URL!;
export const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL!;
export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE!;
export const NETWORK = import.meta.env.VITE_NETWORK ?? "testnet";

// Validate required environment variables
if (!API_URL || !RPC_URL || !NETWORK_PASSPHRASE) {
  const missing = [];
  if (!API_URL) missing.push('VITE_API_URL');
  if (!RPC_URL) missing.push('VITE_SOROBAN_RPC_URL');
  if (!NETWORK_PASSPHRASE) missing.push('VITE_NETWORK_PASSPHRASE');
  
  throw new Error(`Missing required Vite environment variables: ${missing.join(', ')}`);
}

// Type definitions for environment variables
export type NetworkType = "testnet" | "mainnet";

// Validate NETWORK value
if (NETWORK !== "testnet" && NETWORK !== "mainnet") {
  console.warn(`Invalid VITE_NETWORK value: ${NETWORK}. Defaulting to testnet.`);
}

export const ENV = {
  API_URL,
  RPC_URL,
  NETWORK_PASSPHRASE,
  NETWORK: NETWORK as NetworkType,
} as const;

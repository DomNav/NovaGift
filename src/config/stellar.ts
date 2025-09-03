// Stellar network configuration
export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

// Contract IDs
export const NOVAGIFT_CONTRACT_ID = import.meta.env.VITE_NOVAGIFT_CONTRACT_ID || '';
export const USDC_CONTRACT_ID = import.meta.env.VITE_USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
export const XLM_CONTRACT_ID = import.meta.env.VITE_XLM_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Network timeout settings
export const NETWORK_TIMEOUT_MS = 3000;
export const NETWORK_RETRY_COUNT = 1;
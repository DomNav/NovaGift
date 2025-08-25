import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Stellar Network
  horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  networkPassphrase: process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  
  // Contracts
  novaGiftContractId: process.env.NOVAGIFT_CONTRACT_ID || '',
  usdcContractId: process.env.USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  wxlmContractId: process.env.WXLM_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  
  // Assets
  allowedAssets: (process.env.ALLOWED_ASSETS || 'USDC,XLM').split(','),
  
  // Security
  linkSigningKey: process.env.LINK_SIGNING_KEY || 'dev-secret-key',
  feeSponsorKey: process.env.FEE_SPONSOR || '',
  
  // URLs
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  reflectorApiUrl: process.env.REFLECTOR_API_URL || 'https://api.reflector.testnet.example',
  
  // Features
  enableReflector: process.env.ENABLE_REFLECTOR === 'true',
  enableFeeSponsorship: !!process.env.FEE_SPONSOR,
};

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (!config.novaGiftContractId && config.nodeEnv === 'production') {
    errors.push('NOVAGIFT_CONTRACT_ID is required in production');
  }
  
  if (!config.feeSponsorKey && config.enableFeeSponsorship) {
    errors.push('FEE_SPONSOR key is required when fee sponsorship is enabled');
  }
  
  if (config.linkSigningKey === 'dev-secret-key' && config.nodeEnv === 'production') {
    errors.push('LINK_SIGNING_KEY must be changed from default in production');
  }
  
  if (errors.length > 0) {
    throw new Error('Configuration errors:\n' + errors.join('\n'));
  }
}
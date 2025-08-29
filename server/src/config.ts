import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Stellar Network - Auto-detect mainnet vs testnet
  stellarNetwork: process.env.STELLAR_NETWORK || (process.env.NODE_ENV === 'production' ? 'pubnet' : 'testnet'),
  horizonUrl: process.env.HORIZON_URL || (process.env.STELLAR_NETWORK === 'pubnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'),
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL || (process.env.STELLAR_NETWORK === 'pubnet' ? 'https://soroban.stellar.org' : 'https://soroban-testnet.stellar.org'),
  networkPassphrase: process.env.NETWORK_PASSPHRASE || (process.env.STELLAR_NETWORK === 'pubnet' ? 'Public Global Stellar Network ; September 2015' : 'Test SDF Network ; September 2015'),
  
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
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5174',
  reflectorApiUrl: process.env.REFLECTOR_API_URL || 'https://api.reflector.testnet.example',
  
  // Features - Enable Reflector for both testnet and mainnet
  enableReflector: process.env.ENABLE_REFLECTOR === 'true' || process.env.NODE_ENV === 'development' || (process.env.NODE_ENV === 'production' && (process.env.STELLAR_NETWORK === 'pubnet' || !process.env.STELLAR_NETWORK)),
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
#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const SOURCE_ACCOUNT = process.env.SOROBAN_ACCOUNT || process.env.DEPLOYER_SECRET_KEY;

if (!SOURCE_ACCOUNT) {
  console.error('❌ Error: SOROBAN_ACCOUNT or DEPLOYER_SECRET_KEY not set in environment');
  process.exit(1);
}

console.log('🚀 Starting Escrow Contract Deployment');
console.log('📡 Network:', NETWORK);

try {
  // Step 1: Build the contract
  console.log('\n📦 Building escrow contract...');
  execSync('cargo build --release --target wasm32-unknown-unknown', {
    cwd: path.join(process.cwd(), 'contracts/escrow'),
    stdio: 'inherit'
  });

  // Step 2: Optimize the WASM
  const wasmPath = path.join(
    process.cwd(),
    'contracts/escrow/target/wasm32-unknown-unknown/release/escrow.wasm'
  );
  
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file not found at ${wasmPath}`);
  }

  console.log('\n🔧 Optimizing WASM...');
  const optimizedPath = path.join(process.cwd(), 'contracts/escrow/escrow.optimized.wasm');
  
  try {
    execSync(`soroban contract optimize --wasm ${wasmPath} --wasm-out ${optimizedPath}`, {
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('⚠️  Optimization failed, using unoptimized WASM');
    fs.copyFileSync(wasmPath, optimizedPath);
  }

  // Step 3: Deploy the contract
  console.log('\n🎯 Deploying contract to', NETWORK, '...');
  
  const deployCmd = `soroban contract deploy \
    --wasm ${optimizedPath} \
    --source ${SOURCE_ACCOUNT} \
    --network ${NETWORK}`;

  const deployResult = execSync(deployCmd, { encoding: 'utf8' }).trim();
  
  if (!deployResult || !deployResult.startsWith('C')) {
    throw new Error('Deployment failed - no contract ID returned');
  }

  console.log('\n✅ Contract deployed successfully!');
  console.log('📄 Contract ID:', deployResult);

  // Step 4: Initialize the contract (optional - requires admin address)
  if (process.env.ADMIN_PUBLIC_KEY) {
    console.log('\n🔑 Initializing contract with admin...');
    
    const initCmd = `soroban contract invoke \
      --id ${deployResult} \
      --source ${SOURCE_ACCOUNT} \
      --network ${NETWORK} \
      -- \
      initialize \
      --admin ${process.env.ADMIN_PUBLIC_KEY}`;
    
    try {
      execSync(initCmd, { stdio: 'inherit' });
      console.log('✅ Contract initialized with admin:', process.env.ADMIN_PUBLIC_KEY);
    } catch (e) {
      console.log('⚠️  Failed to initialize contract. You may need to do this manually.');
    }
  }

  // Step 5: Save contract ID to .env file
  console.log('\n💾 Saving contract ID to environment...');
  
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if ESCROW_CONTRACT_ID already exists
  if (envContent.includes('ESCROW_CONTRACT_ID=')) {
    // Update existing
    const updatedEnv = envContent.replace(
      /ESCROW_CONTRACT_ID=.*/,
      `ESCROW_CONTRACT_ID=${deployResult}`
    );
    fs.writeFileSync(envPath, updatedEnv);
    console.log('✅ Updated ESCROW_CONTRACT_ID in .env');
  } else {
    // Append new
    fs.appendFileSync(envPath, `\n# Escrow Contract\nESCROW_CONTRACT_ID=${deployResult}\n`);
    console.log('✅ Added ESCROW_CONTRACT_ID to .env');
  }

  // Step 6: Output summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log('Contract ID:', deployResult);
  console.log('\nNext steps:');
  console.log('1. Verify the contract on Stellar Expert (if mainnet)');
  console.log('2. Update any configuration that needs this contract ID');
  console.log('3. Run integration tests to verify deployment');
  
  if (!process.env.ADMIN_PUBLIC_KEY) {
    console.log('\n⚠️  Note: Contract was not initialized with an admin.');
    console.log('   You may need to call initialize() manually.');
  }

  // Clean up
  if (fs.existsSync(optimizedPath)) {
    fs.unlinkSync(optimizedPath);
  }

  process.exit(0);

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
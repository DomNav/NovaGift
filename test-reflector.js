const fetch = require('node-fetch');

async function testReflectorAPI() {
  const api = 'http://localhost:4000';
  const assets = ['XLM', 'USDC', 'AQUA', 'SHX', 'yXLM', 'LSP', 'MOBI', 'RMT', 'ARST', 'EURT'];
  
  console.log('Testing Reflector Network Price Fetching\n');
  console.log('=====================================\n');
  
  for (const asset of assets) {
    try {
      const response = await fetch(`${api}/api/rates/spot?base=${asset}&quote=USD`);
      const data = await response.json();
      
      console.log(`${asset}:`);
      console.log(`  Price: $${data.price || 'N/A'}`);
      console.log(`  Source: ${data.source || 'unknown'}`);
      console.log(`  Status: ${data.ok ? '✓' : '✗'}`);
      if (data.note) console.log(`  Note: ${data.note}`);
      console.log('');
    } catch (error) {
      console.log(`${asset}: Error - ${error.message}\n`);
    }
  }
}

// For testing without server, let's test Reflector directly
const { Contract, Address, rpc, TransactionBuilder, Networks, scValToNative } = require('@stellar/stellar-sdk');

async function testReflectorDirect() {
  console.log('\nTesting Direct Reflector Oracle Connection\n');
  console.log('========================================\n');
  
  const TESTNET_ORACLE_CONTRACT = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";
  const XLM_ADDRESS = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const contract = new Contract(TESTNET_ORACLE_CONTRACT);
  
  try {
    // Build transaction to call lastprice
    const operation = contract.call('lastprice', Address.fromString(XLM_ADDRESS).toScVal());
    
    const account = await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    console.log('Simulating transaction...');
    const simResult = await server.simulateTransaction(transaction);
    
    if (simResult && simResult.result) {
      const priceData = scValToNative(simResult.result.retval);
      if (priceData) {
        const price = Number(priceData.price) / Math.pow(10, 14); // Default 14 decimals
        console.log(`✓ XLM Price from Reflector: $${price.toFixed(7)}`);
        console.log(`  Timestamp: ${new Date(Number(priceData.timestamp) * 1000).toISOString()}`);
      } else {
        console.log('✗ No price data returned from Reflector');
      }
    } else {
      console.log('✗ Simulation failed:', simResult.error);
    }
  } catch (error) {
    console.log('✗ Error connecting to Reflector:', error.message);
  }
}

// Test both if server is running, otherwise just test direct
testReflectorDirect().catch(console.error);
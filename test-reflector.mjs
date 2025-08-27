import { Contract, Address, rpc, TransactionBuilder, Networks, scValToNative } from '@stellar/stellar-sdk';

async function testReflectorDirect() {
  console.log('Testing Direct Reflector Oracle Connection');
  console.log('==========================================\n');
  
  const TESTNET_ORACLE_CONTRACT = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";
  const XLM_ADDRESS = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  
  const testnetAssets = {
    XLM: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    USDC: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    AQUA: "CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMZLFPTP7VHWAMQA",
    SHX: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    YXLM: "CDCUWW7Q2JJSPUGR5R2LWETLWRBWXG26TZTJFVPF6XGRYP4FJATQQTTF",
    LSP: "CDFTHFEVBLCYFHZWKZHXNJKJEBZMKGXMGQZ2WJFBTRZFDWJQSAEVKJ2T",
    MOBI: "CDNVBMHVG4R6QPOCFLRG72X7FQFBQFHH2HDRBX4WBQWQPQXV3HKNWMQ7",
    RMT: "CAUJZQHCFNJYQXJX3T4CLGAECMJZ6JCLLHQ5KLMJZKJZJHKZFZJHKSDB",
    ARST: "CBPJHFAZJXRHVHPWVDGGBCDXLHHHQP3NRXTYQNUZKNQHKZJZQ7XNXBH4",
    EURT: "CCVRJT5Y6ZDMPFTHJTYPFPJ5TBGXGPEHPGQJZRMGQLKJFXKMRRZFX4KC"
  };
  
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const contract = new Contract(TESTNET_ORACLE_CONTRACT);
  
  console.log('Testing prices for all 10 assets:\n');
  
  for (const [assetName, assetAddress] of Object.entries(testnetAssets)) {
    try {
      // Build transaction to call lastprice
      const operation = contract.call('lastprice', Address.fromString(assetAddress).toScVal());
      
      const account = await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      const simResult = await server.simulateTransaction(transaction);
      
      if (simResult && simResult.result && simResult.result.retval) {
        try {
          const priceData = scValToNative(simResult.result.retval);
          if (priceData && priceData.price !== undefined) {
            const price = Number(priceData.price) / Math.pow(10, 14); // Default 14 decimals
            const timestamp = priceData.timestamp ? new Date(Number(priceData.timestamp) * 1000).toISOString() : 'Unknown';
            console.log(`✓ ${assetName}: $${price.toFixed(7)} (Updated: ${timestamp})`);
          } else {
            console.log(`✗ ${assetName}: No price data (asset may not be supported)`);
          }
        } catch (parseError) {
          console.log(`✗ ${assetName}: Error parsing response - ${parseError.message}`);
        }
      } else {
        console.log(`✗ ${assetName}: Simulation failed - ${simResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`✗ ${assetName}: Error - ${error.message}`);
    }
  }
  
  console.log('\n==========================================');
  console.log('Reflector Network Test Complete');
}

// Run the test
testReflectorDirect().catch(console.error);
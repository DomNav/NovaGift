import fetch from 'node-fetch';

// Test configuration
const API_BASE = 'http://localhost:4000';
const ASSETS = ['XLM', 'USDC', 'AQUA', 'SHX', 'yXLM', 'LSP', 'MOBI', 'RMT', 'ARST', 'EURT'];

async function testPriceAPI() {
  console.log('Testing NovaGift Price API');
  console.log('===========================\n');
  
  // First check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE}/api/health`);
    if (!healthCheck.ok) {
      console.log('⚠️  Server health check failed. Make sure the server is running.');
      console.log('   Run: cd server && npm run dev\n');
      return;
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.');
    console.log('   Run: cd server && npm run dev\n');
    return;
  }
  
  console.log('Fetching prices for all 10 tokens:\n');
  console.log('Token  | Price       | Source      | Status');
  console.log('-------|-------------|-------------|--------');
  
  const results = [];
  
  for (const asset of ASSETS) {
    try {
      const response = await fetch(`${API_BASE}/api/rates/spot?base=${asset}&quote=USD`);
      const data = await response.json();
      
      if (data.ok && data.price) {
        const price = typeof data.price === 'number' ? data.price : parseFloat(data.price);
        const formattedPrice = price < 0.01 
          ? price.toExponential(2) 
          : price.toFixed(price < 1 ? 6 : 2);
        
        console.log(`${asset.padEnd(6)} | $${formattedPrice.padEnd(10)} | ${(data.source || 'unknown').padEnd(11)} | ✅`);
        
        results.push({
          asset,
          price,
          source: data.source,
          success: true
        });
      } else {
        console.log(`${asset.padEnd(6)} | ${'—'.padEnd(10)} | ${'error'.padEnd(11)} | ❌`);
        results.push({
          asset,
          error: data.error || 'Unknown error',
          success: false
        });
      }
    } catch (error) {
      console.log(`${asset.padEnd(6)} | ${'—'.padEnd(10)} | ${'error'.padEnd(11)} | ❌`);
      results.push({
        asset,
        error: error.message,
        success: false
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n===========================');
  console.log('Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${ASSETS.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${ASSETS.length}`);
  }
  
  // Check source distribution
  const sources = results
    .filter(r => r.success)
    .reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
  
  console.log('\nPrice Sources:');
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} tokens`);
  });
  
  if (sources.reflector > 0) {
    console.log('\n🎉 Reflector Network integration is working!');
  } else if (sources.coingecko > 0) {
    console.log('\n⚠️  Using CoinGecko prices. Reflector may need configuration.');
  } else if (sources.fallback > 0) {
    console.log('\n⚠️  Using fallback prices. Check external API connections.');
  }
}

// Run the test
testPriceAPI().catch(console.error);
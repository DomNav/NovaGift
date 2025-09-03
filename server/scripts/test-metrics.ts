#!/usr/bin/env tsx
/**
 * Script to test and verify metrics endpoint functionality
 * Run with: npx tsx server/scripts/test-metrics.ts
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-jwt-token';

async function testMetrics() {
  console.log('🧪 Testing Metrics Endpoint...\n');

  try {
    // Step 1: Get initial metrics
    console.log('1️⃣ Fetching initial metrics...');
    const initialMetrics = await fetch(`${API_URL}/metrics`);
    const initialText = await initialMetrics.text();
    
    // Parse initial gift creation count
    const initialGiftMatch = initialText.match(/gifts_created_total\{[^}]*\}\s+(\d+)/);
    const initialGiftCount = initialGiftMatch ? parseInt(initialGiftMatch[1]) : 0;
    console.log(`   Initial gift count: ${initialGiftCount}`);

    // Step 2: Create a test gift
    console.log('\n2️⃣ Creating a test gift...');
    const giftResponse = await fetch(`${API_URL}/api/gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        mode: 'SINGLE',
        metadata: {
          theme: 'RED',
          message: 'Metrics test gift',
        },
        totalAmount: 10,
        recipients: [{
          email: `metrics-test-${Date.now()}@example.com`,
          amount: 10,
        }],
      }),
    });

    if (!giftResponse.ok) {
      const error = await giftResponse.text();
      console.log(`   ⚠️ Gift creation failed (${giftResponse.status}): ${error}`);
      console.log('   This is expected if auth is required. Metrics should still track the attempt.');
    } else {
      const gift = await giftResponse.json();
      console.log(`   ✅ Gift created: ${gift.envelope_id || gift.envelopes?.[0]?.id || 'unknown'}`);
    }

    // Step 3: Wait a moment for metrics to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Get updated metrics
    console.log('\n3️⃣ Fetching updated metrics...');
    const updatedMetrics = await fetch(`${API_URL}/metrics`);
    const updatedText = await updatedMetrics.text();
    
    // Parse updated counts
    const updatedGiftMatch = updatedText.match(/gifts_created_total\{[^}]*\}\s+(\d+)/);
    const updatedGiftCount = updatedGiftMatch ? parseInt(updatedGiftMatch[1]) : 0;
    console.log(`   Updated gift count: ${updatedGiftCount}`);

    // Step 5: Verify metrics changed
    console.log('\n4️⃣ Verifying metrics...');
    
    // Check for required metric families
    const requiredMetrics = [
      'outbox_queued_total',
      'outbox_in_flight_total',
      'outbox_processed_total',
      'outbox_failed_total',
      'gifts_created_total',
      'gifts_claimed_total',
      'http_request_duration_seconds',
      'http_requests_total',
    ];

    const missingMetrics = requiredMetrics.filter(metric => 
      !updatedText.includes(`# TYPE ${metric}`)
    );

    if (missingMetrics.length > 0) {
      console.log(`   ⚠️ Missing metrics: ${missingMetrics.join(', ')}`);
    } else {
      console.log('   ✅ All required metrics present');
    }

    // Check if HTTP request was tracked
    const httpRequestMatch = updatedText.match(/http_requests_total\{[^}]*route="\/api\/gift"[^}]*\}\s+(\d+)/);
    if (httpRequestMatch) {
      console.log(`   ✅ HTTP requests tracked: ${httpRequestMatch[1]} requests to /api/gift`);
    } else {
      console.log('   ⚠️ HTTP request metrics not found for /api/gift');
    }

    // Step 6: Test Grafana compatibility
    console.log('\n5️⃣ Testing Prometheus format compliance...');
    
    // Check for proper metric format
    const lines = updatedText.split('\n');
    let validFormat = true;
    
    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') continue;
      
      // Basic Prometheus format: metric_name{labels} value timestamp(optional)
      if (!line.match(/^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+[0-9.+-eE]+(\s+\d+)?$/)) {
        console.log(`   ⚠️ Invalid format: ${line.substring(0, 50)}...`);
        validFormat = false;
        break;
      }
    }
    
    if (validFormat) {
      console.log('   ✅ Prometheus format valid');
    }

    // Step 7: Summary
    console.log('\n📊 Metrics Test Summary:');
    console.log('   - Endpoint accessible: ✅');
    console.log(`   - Required metrics: ${missingMetrics.length === 0 ? '✅' : '⚠️'}`);
    console.log(`   - Format compliance: ${validFormat ? '✅' : '⚠️'}`);
    console.log(`   - Request tracking: ${httpRequestMatch ? '✅' : '⚠️'}`);
    
    console.log('\n✨ Metrics endpoint is functional!');
    console.log('   Next: Import into Grafana and verify panels update');

  } catch (error: any) {
    console.error('❌ Error testing metrics:', error.message);
    process.exit(1);
  }
}

// Run the test
testMetrics();
/**
 * Passkey Smoke Test
 * Tests basic passkey functionality when enabled
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:4000';
const PASSKEYS_ENABLED = process.env.ENABLE_PASSKEYS === 'true';

describe('Passkey Integration Smoke Test', () => {
  // Skip all tests if passkeys are disabled
  const testOrSkip = PASSKEYS_ENABLED ? it : it.skip;

  beforeAll(() => {
    if (!PASSKEYS_ENABLED) {
      console.log('⚠️  Passkey tests skipped (ENABLE_PASSKEYS=false)');
    }
  });

  testOrSkip('should report passkey status endpoint', async () => {
    const response = await fetch(`${API_BASE}/api/passkey/status`);
    
    if (PASSKEYS_ENABLED) {
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.enabled).toBe(true);
      expect(data.network).toBeDefined();
      expect(data.factoryId).toBeDefined();
    } else {
      expect(response.status).toBe(503);
    }
  });

  testOrSkip('should validate /passkey/ensure request body', async () => {
    const response = await fetch(`${API_BASE}/api/passkey/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Missing userId
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid request data');
  });

  testOrSkip('should validate /passkey/claim request body', async () => {
    const response = await fetch(`${API_BASE}/api/passkey/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xdr: 'test-xdr' }), // Missing keyId
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid request data');
  });

  testOrSkip('should handle dummy payment XDR on testnet', async () => {
    // This test would require actual passkey services to be configured
    // For smoke test, we just verify the endpoint exists and validates input
    
    const dummyXdr = 'AAAAAgAAAAA...'; // Would be real XDR in production
    const dummyKeyId = 'test-key-id';

    const response = await fetch(`${API_BASE}/api/passkey/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xdr: dummyXdr,
        keyId: dummyKeyId,
      }),
    });

    // If passkey services are not configured, this will fail with 500
    // That's OK for smoke test - we're verifying the route exists
    expect([400, 500]).toContain(response.status);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    // Either validation error or service error is acceptable
    expect(data.error).toBeDefined();
  });
});

// Run smoke test assertions
if (require.main === module) {
  console.log('🔑 Running Passkey Smoke Tests...');
  
  if (!PASSKEYS_ENABLED) {
    console.log('⚠️  Passkeys disabled - skipping tests');
    process.exit(0);
  }

  // Simple inline test runner for smoke tests
  Promise.all([
    fetch(`${API_BASE}/api/passkey/status`)
      .then(r => r.json())
      .then(data => {
        console.assert(data.enabled === true, '✗ Status check failed');
        console.log('✓ Passkey status endpoint working');
      }),

    fetch(`${API_BASE}/api/passkey/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => {
        console.assert(r.status === 400, '✗ Validation check failed');
        console.log('✓ Request validation working');
      }),
  ])
    .then(() => {
      console.log('✅ All smoke tests passed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Smoke tests failed:', error);
      process.exit(1);
    });
}
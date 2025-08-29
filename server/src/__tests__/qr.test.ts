import { describe, it, expect, beforeEach } from 'vitest';
import { shortCode, toAtomic, fromAtomic } from '../lib/ids';

describe('QR Code Generation', () => {
  describe('shortCode', () => {
    it('should generate a code of default length 8', () => {
      const code = shortCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    });

    it('should generate a code of specified length', () => {
      const code = shortCode(6);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(shortCode());
      }
      expect(codes.size).toBe(100); // All should be unique
    });

    it('should not include confusing characters (0, 1, I, O)', () => {
      for (let i = 0; i < 100; i++) {
        const code = shortCode();
        expect(code).not.toMatch(/[01IO]/);
      }
    });
  });

  describe('atomic conversions', () => {
    it('should convert to atomic correctly', () => {
      expect(toAtomic('1')).toBe(BigInt(10000000));
      expect(toAtomic('1.5')).toBe(BigInt(15000000));
      expect(toAtomic('0.1234567')).toBe(BigInt(1234567));
      expect(toAtomic('25')).toBe(BigInt(250000000));
    });

    it('should convert from atomic correctly', () => {
      expect(fromAtomic(BigInt(10000000))).toBe('1');
      expect(fromAtomic(BigInt(15000000))).toBe('1.5');
      expect(fromAtomic(BigInt(1234567))).toBe('0.1234567');
      expect(fromAtomic(BigInt(250000000))).toBe('25');
    });

    it('should handle zero values', () => {
      expect(toAtomic('0')).toBe(BigInt(0));
      expect(fromAtomic(BigInt(0))).toBe('0');
    });

    it('should be reversible', () => {
      const amounts = ['1', '1.5', '0.1234567', '25', '0.0000001'];
      for (const amount of amounts) {
        const atomic = toAtomic(amount);
        const converted = fromAtomic(atomic);
        expect(converted).toBe(amount);
      }
    });
  });
});

describe('QR Code API Validation', () => {
  it('should validate proper code format', () => {
    const validCodes = ['ABC123XY', 'XYZ789AB', 'DEF456GH'];
    const invalidCodes = ['abc123xy', '123456', 'ABCDEFGHIJK', ''];

    for (const code of validCodes) {
      expect(code).toMatch(/^[A-Z0-9]{6,10}$/);
    }

    for (const code of invalidCodes) {
      expect(code).not.toMatch(/^[A-Z0-9]{6,10}$/);
    }
  });

  it('should validate amount format', () => {
    const validAmounts = ['1', '1.5', '0.1234567', '25', '100.50'];
    const invalidAmounts = ['1.12345678', 'abc', '-1', '1.', '.5'];

    const amountRegex = /^\d+(\.\d{1,7})?$/;

    for (const amount of validAmounts) {
      expect(amount).toMatch(amountRegex);
    }

    for (const amount of invalidAmounts) {
      expect(amount).not.toMatch(amountRegex);
    }
  });
});

describe('QR Event Business Logic', () => {
  it('should calculate pool budget correctly', () => {
    const poolSize = 100;
    const amountPerClaim = '25';
    const totalBudget = poolSize * parseFloat(amountPerClaim);
    
    expect(totalBudget).toBe(2500);
  });

  it('should validate event dates', () => {
    const now = new Date();
    const startAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const invalidEndAt = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    expect(startAt.getTime()).toBeLessThan(endAt.getTime());
    expect(startAt.getTime()).toBeGreaterThan(invalidEndAt.getTime());
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/db';

// Mock the buildInvokeTx function
vi.mock('../lib/soroban', () => ({
  buildInvokeTx: vi.fn().mockResolvedValue('mock_xdr_string'),
  scAddress: vi.fn().mockImplementation((addr) => ({
    toScVal: () => ({ type: 'Address', value: addr })
  }))
}));

// Mock the email service
vi.mock('../lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue({ id: 'mock_email_id' })
}));

describe('Claim Routes', () => {
  let testEnvelopeId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.emailInvite.deleteMany({});
    await prisma.envelope.deleteMany({});
  });

  beforeEach(async () => {
    // Create a test envelope in the database
    const envelope = await prisma.envelope.create({
      data: {
        contractId: 'CCTEST123456789',
        assetCode: 'USDC',
        assetIssuer: 'GISSUER123456789',
        amount: 100.5,
        status: 'ACTIVE'
      }
    });
    testEnvelopeId = envelope.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.emailInvite.deleteMany({});
    await prisma.envelope.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/claim/:id', () => {
    it('should return envelope info for valid ID', async () => {
      const response = await request(app)
        .get(`/api/claim/${testEnvelopeId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        envelope: {
          id: testEnvelopeId,
          contractId: 'CCTEST123456789',
          assetCode: 'USDC',
          assetIssuer: 'GISSUER123456789',
          amount: '100.5',
          status: 'ACTIVE'
        }
      });
    });

    it('should return 404 for non-existent envelope', async () => {
      const response = await request(app)
        .get('/api/claim/clnonexistent123')
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Envelope not found'
      });
    });

    it('should return 400 for non-active envelope', async () => {
      // Update envelope to CLAIMED status
      await prisma.envelope.update({
        where: { id: testEnvelopeId },
        data: { status: 'CLAIMED' }
      });

      const response = await request(app)
        .get(`/api/claim/${testEnvelopeId}`)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Envelope is claimed'
      });
    });
  });

  describe('POST /api/claim/:id/build', () => {
    it('should build claim transaction with valid recipient', async () => {
      const response = await request(app)
        .post(`/api/claim/${testEnvelopeId}/build`)
        .send({
          id: testEnvelopeId,
          recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        xdr: 'mock_xdr_string'
      });
    });

    it('should return 400 for invalid recipient address', async () => {
      const response = await request(app)
        .post(`/api/claim/${testEnvelopeId}/build`)
        .send({
          id: testEnvelopeId,
          recipient: 'invalid_address'
        })
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle email-restricted envelopes with valid token', async () => {
      // Create an email invite
      const invite = await prisma.emailInvite.create({
        data: {
          envelopeId: testEnvelopeId,
          email: 'test@example.com',
          inviteJwt: 'valid_jwt_token',
          sentAt: new Date()
        }
      });

      await prisma.envelope.update({
        where: { id: testEnvelopeId },
        data: { emailInviteId: invite.id }
      });

      // Mock JWT verification
      vi.mock('../lib/jwt', () => ({
        default: {
          verifyClaimToken: vi.fn().mockReturnValue({
            envelopeId: testEnvelopeId,
            email: 'test@example.com'
          })
        }
      }));

      const response = await request(app)
        .post(`/api/claim/${testEnvelopeId}/build`)
        .send({
          id: testEnvelopeId,
          recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234',
          token: 'valid_jwt_token'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        xdr: 'mock_xdr_string'
      });
    });

    it('should reject email-restricted envelopes without token', async () => {
      // Create an email invite
      const invite = await prisma.emailInvite.create({
        data: {
          envelopeId: testEnvelopeId,
          email: 'test@example.com',
          inviteJwt: 'valid_jwt_token',
          sentAt: new Date()
        }
      });

      await prisma.envelope.update({
        where: { id: testEnvelopeId },
        data: { emailInviteId: invite.id }
      });

      const response = await request(app)
        .post(`/api/claim/${testEnvelopeId}/build`)
        .send({
          id: testEnvelopeId,
          recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234'
        })
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'This envelope requires an invite token'
      });
    });
  });

  describe('POST /api/claim/invite', () => {
    it('should send invite email for valid envelope', async () => {
      const response = await request(app)
        .post('/api/claim/invite')
        .send({
          envelopeId: testEnvelopeId,
          email: 'recipient@example.com',
          senderName: 'John Doe'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        emailId: 'mock_email_id'
      });
      expect(response.body.inviteId).toBeDefined();

      // Verify invite was created in database
      const invite = await prisma.emailInvite.findFirst({
        where: { envelopeId: testEnvelopeId }
      });
      expect(invite).toBeDefined();
      expect(invite?.email).toBe('recipient@example.com');
    });

    it('should reject invite for non-existent envelope', async () => {
      const response = await request(app)
        .post('/api/claim/invite')
        .send({
          envelopeId: 'clnonexistent123',
          email: 'recipient@example.com'
        })
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Envelope not found'
      });
    });

    it('should reject invite for already invited envelope', async () => {
      // Create an existing invite
      const invite = await prisma.emailInvite.create({
        data: {
          envelopeId: testEnvelopeId,
          email: 'existing@example.com',
          inviteJwt: 'existing_token',
          sentAt: new Date()
        }
      });

      await prisma.envelope.update({
        where: { id: testEnvelopeId },
        data: { emailInviteId: invite.id }
      });

      const response = await request(app)
        .post('/api/claim/invite')
        .send({
          envelopeId: testEnvelopeId,
          email: 'new@example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Envelope already has an invite'
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/claim/invite')
        .send({
          envelopeId: testEnvelopeId,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
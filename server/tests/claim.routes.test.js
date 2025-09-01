"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../src/server"));
const db_1 = __importDefault(require("../src/db"));
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
(0, vitest_1.describe)('Claim Routes', () => {
    let testEnvelopeId;
    (0, vitest_1.beforeAll)(async () => {
        // Clean up test data
        await db_1.default.emailInvite.deleteMany({});
        await db_1.default.envelope.deleteMany({});
    });
    (0, vitest_1.beforeEach)(async () => {
        // Create a test envelope in the database
        const envelope = await db_1.default.envelope.create({
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
    (0, vitest_1.afterAll)(async () => {
        // Clean up
        await db_1.default.emailInvite.deleteMany({});
        await db_1.default.envelope.deleteMany({});
        await db_1.default.$disconnect();
    });
    (0, vitest_1.describe)('GET /api/claim/:id', () => {
        (0, vitest_1.it)('should return envelope info for valid ID', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/api/claim/${testEnvelopeId}`)
                .expect(200);
            (0, vitest_1.expect)(response.body).toMatchObject({
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
        (0, vitest_1.it)('should return 404 for non-existent envelope', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/claim/clnonexistent123')
                .expect(404);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: false,
                error: 'Envelope not found'
            });
        });
        (0, vitest_1.it)('should return 400 for non-active envelope', async () => {
            // Update envelope to CLAIMED status
            await db_1.default.envelope.update({
                where: { id: testEnvelopeId },
                data: { status: 'CLAIMED' }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/api/claim/${testEnvelopeId}`)
                .expect(400);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: false,
                error: 'Envelope is claimed'
            });
        });
    });
    (0, vitest_1.describe)('POST /api/claim/:id/build', () => {
        (0, vitest_1.it)('should build claim transaction with valid recipient', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/claim/${testEnvelopeId}/build`)
                .send({
                id: testEnvelopeId,
                recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234'
            })
                .expect(200);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: true,
                xdr: 'mock_xdr_string'
            });
        });
        (0, vitest_1.it)('should return 400 for invalid recipient address', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/claim/${testEnvelopeId}/build`)
                .send({
                id: testEnvelopeId,
                recipient: 'invalid_address'
            })
                .expect(400);
            (0, vitest_1.expect)(response.body.ok).toBe(false);
            (0, vitest_1.expect)(response.body.error.code).toBe('VALIDATION_ERROR');
        });
        (0, vitest_1.it)('should handle email-restricted envelopes with valid token', async () => {
            // Create an email invite
            const invite = await db_1.default.emailInvite.create({
                data: {
                    envelopeId: testEnvelopeId,
                    email: 'test@example.com',
                    inviteJwt: 'valid_jwt_token',
                    sentAt: new Date()
                }
            });
            await db_1.default.envelope.update({
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
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/claim/${testEnvelopeId}/build`)
                .send({
                id: testEnvelopeId,
                recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234',
                token: 'valid_jwt_token'
            })
                .expect(200);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: true,
                xdr: 'mock_xdr_string'
            });
        });
        (0, vitest_1.it)('should reject email-restricted envelopes without token', async () => {
            // Create an email invite
            const invite = await db_1.default.emailInvite.create({
                data: {
                    envelopeId: testEnvelopeId,
                    email: 'test@example.com',
                    inviteJwt: 'valid_jwt_token',
                    sentAt: new Date()
                }
            });
            await db_1.default.envelope.update({
                where: { id: testEnvelopeId },
                data: { emailInviteId: invite.id }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/claim/${testEnvelopeId}/build`)
                .send({
                id: testEnvelopeId,
                recipient: 'GABC123DEF456789012345678901234567890123456789012345678901234'
            })
                .expect(403);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: false,
                error: 'This envelope requires an invite token'
            });
        });
    });
    (0, vitest_1.describe)('POST /api/claim/invite', () => {
        (0, vitest_1.it)('should send invite email for valid envelope', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/claim/invite')
                .send({
                envelopeId: testEnvelopeId,
                email: 'recipient@example.com',
                senderName: 'John Doe'
            })
                .expect(200);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: true,
                emailId: 'mock_email_id'
            });
            (0, vitest_1.expect)(response.body.inviteId).toBeDefined();
            // Verify invite was created in database
            const invite = await db_1.default.emailInvite.findFirst({
                where: { envelopeId: testEnvelopeId }
            });
            (0, vitest_1.expect)(invite).toBeDefined();
            (0, vitest_1.expect)(invite?.email).toBe('recipient@example.com');
        });
        (0, vitest_1.it)('should reject invite for non-existent envelope', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/claim/invite')
                .send({
                envelopeId: 'clnonexistent123',
                email: 'recipient@example.com'
            })
                .expect(404);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: false,
                error: 'Envelope not found'
            });
        });
        (0, vitest_1.it)('should reject invite for already invited envelope', async () => {
            // Create an existing invite
            const invite = await db_1.default.emailInvite.create({
                data: {
                    envelopeId: testEnvelopeId,
                    email: 'existing@example.com',
                    inviteJwt: 'existing_token',
                    sentAt: new Date()
                }
            });
            await db_1.default.envelope.update({
                where: { id: testEnvelopeId },
                data: { emailInviteId: invite.id }
            });
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/claim/invite')
                .send({
                envelopeId: testEnvelopeId,
                email: 'new@example.com'
            })
                .expect(400);
            (0, vitest_1.expect)(response.body).toMatchObject({
                ok: false,
                error: 'Envelope already has an invite'
            });
        });
        (0, vitest_1.it)('should validate email format', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/claim/invite')
                .send({
                envelopeId: testEnvelopeId,
                email: 'invalid-email'
            })
                .expect(400);
            (0, vitest_1.expect)(response.body.ok).toBe(false);
            (0, vitest_1.expect)(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
});

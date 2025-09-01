"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../src/db");
const soroban_1 = require("../lib/soroban");
const jwt_1 = __importDefault(require("../lib/jwt"));
const email_1 = require("../lib/email");
const log_1 = require("../src/lib/log");
const router = (0, express_1.Router)();
const claimInfoSchema = zod_1.z.object({
    id: zod_1.z.string().cuid()
});
const buildClaimSchema = zod_1.z.object({
    id: zod_1.z.string().cuid(),
    recipient: zod_1.z.string().regex(/^G[A-Z0-9]{55}$/),
    token: zod_1.z.string().optional()
});
const sendInviteSchema = zod_1.z.object({
    envelopeId: zod_1.z.string().cuid(),
    email: zod_1.z.string().email(),
    senderName: zod_1.z.string().optional()
});
router.get("/claim/:id", async (req, res, next) => {
    try {
        const { id } = claimInfoSchema.parse(req.params);
        log_1.logger.info({ envelopeId: id }, "Fetching envelope info");
        const envelope = await db_1.prisma.envelope.findUnique({
            where: { id },
            select: {
                id: true,
                contractId: true,
                assetCode: true,
                asset: true,
                assetIssuer: true,
                amount: true,
                status: true,
                createdAt: true,
                claimedAt: true
            }
        });
        if (!envelope) {
            return res.status(404).json({
                ok: false,
                error: "Envelope not found"
            });
        }
        if (envelope.status !== "FUNDED") {
            return res.status(400).json({
                ok: false,
                error: `Envelope is ${envelope.status.toLowerCase()}`
            });
        }
        return res.json({
            ok: true,
            envelope: {
                ...envelope,
                assetCode: envelope.assetCode || envelope.asset,
                amount: envelope.amount.toString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/claim/:id/build", async (req, res, next) => {
    try {
        const { id } = claimInfoSchema.parse(req.params);
        const { recipient, token } = buildClaimSchema.parse(req.body);
        log_1.logger.info({ envelopeId: id, recipient }, "Building claim transaction");
        if (token) {
            try {
                const payload = jwt_1.default.verifyClaimToken(token);
                if (payload.envelopeId !== id) {
                    return res.status(403).json({
                        ok: false,
                        error: "Invalid token for this envelope"
                    });
                }
            }
            catch (err) {
                return res.status(403).json({
                    ok: false,
                    error: "Invalid or expired token"
                });
            }
        }
        const envelope = await db_1.prisma.envelope.findUnique({
            where: { id },
            select: {
                contractId: true,
                status: true,
                emailInviteId: true
            }
        });
        if (!envelope) {
            return res.status(404).json({
                ok: false,
                error: "Envelope not found"
            });
        }
        if (envelope.status !== "FUNDED") {
            return res.status(400).json({
                ok: false,
                error: `Envelope is ${envelope.status.toLowerCase()}`
            });
        }
        if (envelope.emailInviteId && !token) {
            return res.status(403).json({
                ok: false,
                error: "This envelope requires an invite token"
            });
        }
        const args = [
            (0, soroban_1.scAddress)(recipient).toScVal()
        ];
        const xdrString = await (0, soroban_1.buildInvokeTx)(recipient, envelope.contractId, "claim", args);
        return res.json({
            ok: true,
            xdr: xdrString
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/claim/invite", async (req, res, next) => {
    try {
        const { envelopeId, email, senderName } = sendInviteSchema.parse(req.body);
        log_1.logger.info({ envelopeId, email }, "Sending envelope invite");
        const envelope = await db_1.prisma.envelope.findUnique({
            where: { id: envelopeId },
            select: {
                id: true,
                amount: true,
                assetCode: true,
                asset: true,
                status: true,
                emailInviteId: true
            }
        });
        if (!envelope) {
            return res.status(404).json({
                ok: false,
                error: "Envelope not found"
            });
        }
        if (envelope.status !== "FUNDED") {
            return res.status(400).json({
                ok: false,
                error: `Envelope is ${envelope.status.toLowerCase()}`
            });
        }
        if (envelope.emailInviteId) {
            return res.status(400).json({
                ok: false,
                error: "Envelope already has an invite"
            });
        }
        const inviteToken = jwt_1.default.signClaimToken({
            envelopeId: envelope.id,
            email
        });
        const emailResult = await (0, email_1.sendInviteEmail)({
            recipientEmail: email,
            amount: envelope.amount.toString(),
            assetCode: envelope.assetCode || envelope.asset,
            envelopeId: envelope.id,
            inviteToken,
            senderName
        });
        const invite = await db_1.prisma.emailInvite.create({
            data: {
                envelopeId: envelope.id,
                email,
                inviteJwt: inviteToken,
                sentAt: new Date()
            }
        });
        await db_1.prisma.envelope.update({
            where: { id: envelopeId },
            data: { emailInviteId: invite.id }
        });
        return res.json({
            ok: true,
            inviteId: invite.id,
            emailId: emailResult.id
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;

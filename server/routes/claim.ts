import { Router } from "express";
import { z } from "zod";
import { prisma } from "../src/db/client.js";
import { buildInvokeTx, scAddress } from "../lib/soroban";
import jwt from "../lib/jwt";
import { sendInviteEmail } from "../lib/email";
import { xdr } from "@stellar/stellar-sdk";
import { logger } from "../src/lib/log";

const router = Router();

const claimInfoSchema = z.object({
  id: z.string().cuid()
});

const buildClaimSchema = z.object({
  id: z.string().cuid(),
  recipient: z.string().regex(/^G[A-Z0-9]{55}$/),
  token: z.string().optional()
});

const sendInviteSchema = z.object({
  envelopeId: z.string().cuid(),
  email: z.string().email(),
  senderName: z.string().optional()
});

router.get("/claim/:id", async (req, res, next) => {
  try {
    const { id } = claimInfoSchema.parse(req.params);
    logger.info({ envelopeId: id }, "Fetching envelope info");
    
    const envelope = await prisma.envelope.findUnique({
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
  } catch (error) {
    next(error);
  }
});

router.post("/claim/:id/build", async (req, res, next) => {
  try {
    const { id } = claimInfoSchema.parse(req.params);
    const { recipient, token } = buildClaimSchema.parse(req.body);
    logger.info({ envelopeId: id, recipient }, "Building claim transaction");
    
    if (token) {
      try {
        const payload = jwt.verifyClaimToken(token);
        if (payload.envelopeId !== id) {
          return res.status(403).json({
            ok: false,
            error: "Invalid token for this envelope"
          });
        }
      } catch (err) {
        return res.status(403).json({
          ok: false,
          error: "Invalid or expired token"
        });
      }
    }
    
    const envelope = await prisma.envelope.findUnique({
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
      scAddress(recipient).toScVal()
    ];
    
    if (!envelope.contractId) {
      return res.status(500).json({
        ok: false,
        error: "Envelope missing contract ID"
      });
    }
    
    const xdrString = await buildInvokeTx(
      recipient,
      envelope.contractId,
      "claim",
      args
    );
    
    return res.json({
      ok: true,
      xdr: xdrString
    });
  } catch (error) {
    next(error);
  }
});

router.post("/claim/invite", async (req, res, next) => {
  try {
    const { envelopeId, email, senderName } = sendInviteSchema.parse(req.body);
    logger.info({ envelopeId, email }, "Sending envelope invite");
    
    const envelope = await prisma.envelope.findUnique({
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
    
    const inviteToken = jwt.signClaimToken({
      envelopeId: envelope.id,
      email
    });
    
    const emailResult = await sendInviteEmail({
      recipientEmail: email,
      amount: envelope.amount.toString(),
      assetCode: envelope.assetCode || envelope.asset,
      envelopeId: envelope.id,
      inviteToken,
      senderName
    });
    
    const invite = await prisma.emailInvite.create({
      data: {
        envelopeId: envelope.id,
        email,
        inviteJwt: inviteToken,
        sentAt: new Date()
      }
    });
    
    await prisma.envelope.update({
      where: { id: envelopeId },
      data: { emailInviteId: invite.id }
    });
    
    return res.json({
      ok: true,
      inviteId: invite.id,
      emailId: emailResult.id
    });
  } catch (error) {
    next(error);
  }
});

export default router;
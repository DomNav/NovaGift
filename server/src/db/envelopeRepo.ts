import { z } from 'zod';
import { Asset, EnvelopeStatus, Prisma } from '@prisma/client';
import { prisma } from './client.js';

const CreateEnvelopeSchema = z.object({
  id: z.string().max(64),
  status: z.nativeEnum(EnvelopeStatus),
  asset: z.nativeEnum(Asset),
  amount: z.union([z.string(), z.number(), z.instanceof(Prisma.Decimal)]),
  decimals: z.number().int(),
  sender: z.string(),
  hash: z.string(),
  expiryTs: z.number().int(),
  message: z.string().optional().nullable(),
});

const MarkFundedSchema = z.object({
  id: z.string(),
  fundedTxId: z.string(),
});

const MarkOpenedSchema = z.object({
  id: z.string(),
  openedTxId: z.string(),
  amountDelivered: z.union([z.string(), z.number(), z.instanceof(Prisma.Decimal)]).optional(),
  assetDelivered: z.nativeEnum(Asset).optional(),
});

const MarkCanceledSchema = z.object({
  id: z.string(),
  canceledTxId: z.string(),
});

const ListActivitySchema = z.object({
  wallet: z.string(),
  options: z.object({
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(100).default(20),
  }).optional(),
});

export async function createEnvelope(input: z.infer<typeof CreateEnvelopeSchema>) {
  const validated = CreateEnvelopeSchema.parse(input);
  
  return prisma.envelope.create({
    data: {
      id: validated.id,
      status: validated.status,
      asset: validated.asset,
      amount: new Prisma.Decimal(validated.amount.toString()),
      decimals: validated.decimals,
      sender: validated.sender,
      hash: validated.hash,
      expiryTs: validated.expiryTs,
      message: validated.message,
    },
  });
}

export async function markFunded(id: string, fundedTxId: string) {
  const validated = MarkFundedSchema.parse({ id, fundedTxId });
  
  return prisma.envelope.update({
    where: { id: validated.id },
    data: {
      status: EnvelopeStatus.FUNDED,
      fundedTxId: validated.fundedTxId,
      fundedAt: new Date(),
    },
  });
}

export async function markOpened(
  id: string,
  openedTxId: string,
  amountDelivered?: string | number | Prisma.Decimal,
  assetDelivered?: Asset,
  recipient?: string
) {
  const validated = MarkOpenedSchema.parse({
    id,
    openedTxId,
    amountDelivered,
    assetDelivered,
  });
  
  return prisma.envelope.update({
    where: { id: validated.id },
    data: {
      status: EnvelopeStatus.OPENED,
      openedTxId: validated.openedTxId,
      openedAt: new Date(),
      recipient,
      amountDelivered: validated.amountDelivered
        ? new Prisma.Decimal(validated.amountDelivered.toString())
        : undefined,
      assetDelivered: validated.assetDelivered,
    },
  });
}

export async function markCanceled(id: string, canceledTxId: string) {
  const validated = MarkCanceledSchema.parse({ id, canceledTxId });
  
  return prisma.envelope.update({
    where: { id: validated.id },
    data: {
      status: EnvelopeStatus.CANCELED,
      canceledTxId: validated.canceledTxId,
      canceledAt: new Date(),
    },
  });
}

export async function getEnvelope(id: string) {
  return prisma.envelope.findUnique({
    where: { id },
  });
}

export async function listActivity(
  wallet: string,
  options?: { cursor?: string; limit?: number }
) {
  const validated = ListActivitySchema.parse({ wallet, options });
  const limit = validated.options?.limit ?? 20;
  
  const where: Prisma.EnvelopeWhereInput = {
    OR: [
      { sender: validated.wallet },
      { recipient: validated.wallet },
    ],
  };
  
  const queryOptions: Prisma.EnvelopeFindManyArgs = {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  };
  
  if (validated.options?.cursor) {
    queryOptions.cursor = { id: validated.options.cursor };
    queryOptions.skip = 1;
  }
  
  const items = await prisma.envelope.findMany(queryOptions);
  
  let nextCursor: string | undefined = undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }
  
  return {
    items,
    nextCursor,
  };
}
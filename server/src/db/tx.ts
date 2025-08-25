import { PrismaClient } from '@prisma/client';
import { prisma } from './client.js';

export async function withTx<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as PrismaClient);
  });
}
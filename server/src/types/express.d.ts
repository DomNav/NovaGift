declare global {
  namespace Express {
    interface Request {
      profile?: {
        wallet: string;
        km: number;
        usdEarned: any; // Decimal from Prisma
        language: string;
        consentGiven: boolean;
        consentTimestamp: Date | null;
        dataRetentionUntil: Date | null;
        createdAt: Date;
      };
      user?: { id: string; wallet?: string };
    }
  }
}

export {};

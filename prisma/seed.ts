import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoProfile = await prisma.profile.upsert({
    where: { wallet: 'GDEMO7Q2KZZZEXAMPLEWALLETADDRESSFORSEEDING7Q2KZZ' },
    update: {},
    create: {
      wallet: 'GDEMO7Q2KZZZEXAMPLEWALLETADDRESSFORSEEDING7Q2KZZ',
      km: 1337,
      usdEarned: '42.00',
      language: 'en',
      consentGiven: true,
      consentTimestamp: new Date(),
      dataRetentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log({ demoProfile });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
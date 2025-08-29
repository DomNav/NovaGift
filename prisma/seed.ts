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

  // === Mock contacts =========================================
  await prisma.contact.createMany({
    data: [
      {
        displayName: 'Alice Smith',
        email: 'alice@example.com',
        wallet: 'GAG6U5Q7VJ3JEXAMPLEEXAMPLEEXAMPLEEXAMPLEVIP',
        tags: ['VIP', 'Team'],
      },
      {
        displayName: 'Bob Chen',
        wallet: 'GBB6U5Q7VJ3JEXAMPLEEXAMPLEEXAMPLEEXAMPLE123',
        tags: ['Friends'],
      },
      {
        displayName: 'Carla Diaz',
        email: 'carla@example.com',
        tags: ['Vendors'],
      },
    ],
    skipDuplicates: true,
  });
  // ============================================================
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
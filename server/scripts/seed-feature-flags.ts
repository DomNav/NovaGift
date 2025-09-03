import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const featureFlags = [
  {
    key: 'nft_attachments',
    name: 'NFT Attachments',
    description: 'Allow users to attach NFTs to gift envelopes',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'feature',
      tier: 'premium',
    },
  },
  {
    key: 'multi_asset_support',
    name: 'Multi-Asset Support',
    description: 'Support multiple cryptocurrencies beyond XLM and USDC',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'feature',
      supportedAssets: ['XLM', 'USDC'],
    },
  },
  {
    key: 'social_sharing',
    name: 'Social Sharing',
    description: 'Enable social media sharing of gift links',
    enabled: true,
    rollout: 100,
    metadata: {
      category: 'growth',
      platforms: ['twitter', 'facebook', 'whatsapp'],
    },
  },
  {
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed analytics dashboard for gift creators',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'analytics',
      tier: 'enterprise',
    },
  },
  {
    key: 'custom_themes',
    name: 'Custom Themes',
    description: 'Allow users to create and save custom envelope themes',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'personalization',
      tier: 'premium',
    },
  },
  {
    key: 'scheduled_gifts',
    name: 'Scheduled Gifts',
    description: 'Schedule gifts to be sent at a future date/time',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'feature',
      tier: 'premium',
    },
  },
  {
    key: 'recurring_gifts',
    name: 'Recurring Gifts',
    description: 'Set up recurring gift payments (weekly/monthly)',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'feature',
      tier: 'enterprise',
    },
  },
  {
    key: 'ai_message_suggestions',
    name: 'AI Message Suggestions',
    description: 'AI-powered gift message suggestions',
    enabled: false,
    rollout: 0,
    metadata: {
      category: 'ai',
      model: 'gpt-3.5-turbo',
    },
    conditions: {
      environments: ['development', 'staging'],
    },
  },
];

async function seedFeatureFlags() {
  console.log('Seeding feature flags...');

  for (const flag of featureFlags) {
    try {
      const existing = await prisma.featureFlag.findUnique({
        where: { key: flag.key },
      });

      if (existing) {
        console.log(`Flag ${flag.key} already exists, skipping...`);
        continue;
      }

      await prisma.featureFlag.create({
        data: flag,
      });

      console.log(`Created feature flag: ${flag.name} (${flag.key})`);
    } catch (error) {
      console.error(`Error creating flag ${flag.key}:`, error);
    }
  }

  console.log('Feature flags seeded successfully!');
}

seedFeatureFlags()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
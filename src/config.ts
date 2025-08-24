export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
  },
  app: {
    name: 'NovaGift',
    tagline: 'Seal now, open true.',
    version: '0.1.0',
  },
  stellar: {
    network: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  tokens: {
    USDC: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      decimals: 7,
    },
    XLM: {
      code: 'XLM',
      issuer: 'native',
      decimals: 7,
    },
  },
  skins: {
    presets: [
      { id: 'silver', name: 'Silver', start: '#E0E0E0', mid: '#B0B0B0', end: '#808080' },
      { id: 'holo-blue', name: 'Holo Blue', start: '#1D2BFF', mid: '#4A5FFF', end: '#7B8CFF' },
      { id: 'emerald', name: 'Emerald', start: '#10B981', mid: '#34D399', end: '#6EE7B7' },
      { id: 'sunset', name: 'Sunset', start: '#F59E0B', mid: '#FB923C', end: '#FCD34D' },
      { id: 'amethyst', name: 'Amethyst', start: '#9333EA', mid: '#A855F7', end: '#C084FC' },
      { id: 'obsidian', name: 'Obsidian', start: '#1F2937', mid: '#374151', end: '#4B5563' },
    ],
  },
}
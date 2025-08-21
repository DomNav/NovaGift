# SoroSeal - Seal now, open true.

A modern React application for creating and managing USDC gift envelopes on the Stellar blockchain.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Scripts

- `npm run dev` - Start development server on port 5173
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests with Vitest

## Project Structure

```
soroseal/
├── src/
│   ├── components/
│   │   ├── Button/             # Button components with effects
│   │   ├── effects/            # Animation and effect components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Main app layout wrapper
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── Header.tsx       # Top header with wallet
│   │   ├── skins/              # Envelope skin components
│   │   └── ui/
│   │       ├── EnvelopeCard.tsx # Gift envelope component
│   │       ├── QRCard.tsx       # QR code display
│   │       ├── PriceBox.tsx     # Payment calculator
│   │       ├── SendButton.tsx   # Animated send button
│   │       ├── SkinCard.tsx     # Gradient skin selector
│   │       └── Toast.tsx        # Notification toasts
│   ├── contexts/               # React contexts
│   ├── pages/
│   │   ├── Create.tsx           # Create new envelope
│   │   ├── Fund.tsx             # Fund envelope with QR
│   │   ├── Open.tsx             # Open/reveal envelope
│   │   ├── Activity.tsx        # Transaction history
│   │   ├── KaleSkins.tsx       # Envelope skin customization
│   │   ├── SkinStore.tsx       # Skin marketplace
│   │   ├── Studio.tsx          # Skin editor
│   │   └── Settings.tsx        # App preferences
│   ├── hooks/
│   │   └── useToast.tsx        # Toast notification hook
│   ├── lib/
│   │   ├── wallet.ts           # Freighter wallet integration
│   │   └── notify.ts           # Notification utilities
│   ├── store/                  # Zustand stores
│   ├── styles/
│   │   └── tokens.css          # CSS design tokens
│   ├── test/                   # Test utilities
│   ├── utils/                  # Helper functions
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # App entry point
│   ├── config.ts               # App configuration
│   └── index.css               # Global styles
├── server/                     # Backend server
│   ├── index.ts               # Server entry point
│   └── templates/             # Email templates
├── public/                     # Static assets
│   └── assets/
│       └── images/            # Image assets
├── docs/                       # Documentation
├── dist/                       # Build output
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Features

### Core Pages
- **Create**: Design and create gift envelopes with custom amounts and expiry dates
- **Fund**: Add funds to envelopes via QR code or direct transfer
- **Open**: Reveal and claim gift envelopes with animations
- **Activity**: View transaction history with detailed modal views
- **Kale Skins**: Customize envelope appearance with gradient themes
- **Settings**: Configure app preferences and network settings

### Key Components
- **EnvelopeCard**: Displays sealed/revealed envelope states with animations
- **QRCard**: Generates QR codes for easy funding
- **PriceBox**: Real-time price calculation with USDC/XLM conversion
- **SendButton**: Animated button with loading and success states
- **Toast**: Non-intrusive notifications for user feedback

## Theming

### Brand Colors
The app uses CSS variables for theming. Update colors in `src/styles/tokens.css`:

```css
:root {
  --brand-primary: #1D2BFF;    /* Main brand blue */
  --brand-bg: #0B1020;          /* Dark background */
  --brand-surface: #0E1220;     /* Card backgrounds */
  --brand-text: #F8FAFF;        /* Text color */
  --brand-positive: #2ECC71;    /* Success green */
}
```

### Replacing Brand Colors
1. Extract colors from your logo/brand assets
2. Update CSS variables in `src/styles/tokens.css`
3. Restart dev server to see changes

### Gradient Skins
Customize envelope gradients in `src/config.ts`:

```typescript
skins: {
  presets: [
    { id: 'custom', name: 'Custom', start: '#FF0000', mid: '#00FF00', end: '#0000FF' }
  ]
}
```

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom design tokens
- **Routing**: React Router v6
- **Fonts**: Antonio (headings), Inter (UI)
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE=http://localhost:4000

# Email Notification Service
VITE_NOTIFY_URL=http://localhost:4000
VITE_WEBHOOK_SECRET=soro_dev_secret

# Notification Server (for server/index.ts)
RESEND_API_KEY=your_resend_key
MAIL_FROM=Soroseal <no-reply@soroseal.app>
APP_BASE_URL=http://localhost:5174
WEBHOOK_SECRET=soro_dev_secret
PORT=4000
```

## Email Notify (Optional)

SoroSeal includes an optional email notification feature that sends recipients a claim link when their envelope is funded.

### Setup

1. **Install dependencies** (already included if you ran `npm install`):
   ```bash
   npm install
   ```

2. **Configure Resend** (or alternative email provider):
   - Sign up for a free [Resend](https://resend.com) account
   - Get your API key from the dashboard
   - Update `RESEND_API_KEY` in your `.env` file

3. **Start the notification server**:
   ```bash
   npm run notify:dev
   ```
   This runs the Express server on port 4000 (configurable via `PORT` env var)

4. **Start the main app** (in a separate terminal):
   ```bash
   npm run dev
   ```

### How it works

1. When creating an envelope, users can optionally enter a recipient email
2. After the envelope is funded, the server sends a one-time claim link
3. Recipients click the link to open their envelope in the app
4. The system uses HMAC signatures for secure webhook calls
5. Emails are sent only once per envelope (idempotency check)

### Security Notes

- No PII is stored on-chain
- Server uses HMAC verification for all webhook calls
- Email addresses are not stored persistently (only in-memory for hackathon)
- For production, implement proper data storage and rate limiting

## Backend Integration TODOs

The app is currently running with mock data. To connect to real services:

### 1. Reflector Oracle Integration
- [ ] Connect to Reflector price feed for real-time USDC/XLM rates
- [ ] Update `PriceBox` component with live prices
- [ ] Add price refresh mechanism

### 2. Soroswap Protocol
- [ ] Integrate Soroswap SDK for token swaps
- [ ] Implement best route calculation
- [ ] Add slippage protection

### 3. GiftEscrow Smart Contract
- [ ] Deploy and connect escrow contract
- [ ] Implement envelope creation transaction
- [ ] Add fund/claim/refund operations
- [ ] Handle expiry and auto-return logic

### 4. Wallet Integration
- [ ] Complete Freighter wallet integration
- [ ] Add transaction signing
- [ ] Implement balance checking
- [ ] Add network switching (testnet/mainnet)

### 5. Backend API
- [ ] Create API endpoints for envelope CRUD
- [ ] Implement activity tracking
- [ ] Add notification webhooks
- [ ] Store skin preferences

## Development Notes

### Font Installation
Fonts are included via @fontsource packages and imported in `index.css`.

### Confetti Effect
The send button triggers a confetti animation on successful transactions using `canvas-confetti`.

### Gradient Shader Card
The Kale Skins page uses dynamic gradient backgrounds that can be applied to envelopes.

## Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to hosting service
# Upload contents of dist/ folder
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
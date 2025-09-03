# NovaGift - Blockchain Gift Envelopes

NovaGift is a decentralized platform for sending cryptocurrency gifts through digital envelopes on the Stellar/Soroban network. Recipients see the USD value of their gift at the moment it was funded, regardless of market fluctuations.

## 🚀 New Backend Features

- **HTLC-based secure envelopes** with preimage/hash claiming
- **JWT-signed one-time links** with 30-minute expiry
- **Fee sponsorship** - recipients pay zero fees
- **Cross-asset delivery** via Reflector integration
- **Rate limiting** for API protection
- **In-memory store** for MVP (SQLite ready)
- **Send XLM (Testnet)**: client signs in Freighter; supports unfunded recipients (CreateAccount).
  Endpoint: POST /api/wallet/build-xlm-payment

## Architecture

### Smart Contracts (Soroban)
- **Envelope Contract**: Core logic for creating and opening gift envelopes
- **Reflector Integration**: Oracle access for USD price feeds
- **Token Support**: SAC-compliant tokens (USDC, wXLM)

### Backend (Node.js/TypeScript)
- **KM/Rewards API**: Track user karma and rewards
- **Email Notifications**: Resend integration for envelope claims
- **SQLite Database**: Persistent storage for user profiles
- **SEP-10 Authentication**: Real wallet auth via Freighter
- **KALE Token Gating**: Hold-to-unlock premium skins via Soroban

### Frontend (React/TypeScript)
- **Multi-Wallet Support**: Stellar Wallets Kit integration (Freighter, Albedo, xBull, etc.)
- **Passkey Smart-Wallets (beta)**: Optional WebAuthn-based smart contract wallets
- **Interactive UI**: Animated envelope reveals
- **Studio Mode**: Custom skins and personalization

## Prerequisites

- Node.js 18+ and npm/pnpm
- Rust 1.70+ with wasm32-unknown-unknown target
- Soroban CLI
- Stellar Freighter wallet extension

## Quick Start

### Passkey Smart-Wallet (beta)

NovaGift includes optional support for [Passkey Kit](https://github.com/kalepail/passkey-kit) smart contract wallets. This feature is experimental and disabled by default.

**⚠️ Security Audit Warning**: The passkey-kit integration has not been audited. Use at your own risk and only on testnet.

To enable passkey support:

1. Set `ENABLE_PASSKEYS=true` in your `.env` file
2. Configure the required passkey services:
   - `STELLAR_RPC_URL` - Stellar RPC endpoint
   - `PASSKEY_FACTORY_ID` - Factory contract ID from passkey-kit deployment
   - `MERCURY_URL` and `MERCURY_JWT` - Mercury indexer service
   - `LAUNCHTUBE_URL` and `LAUNCHTUBE_JWT` - LaunchTube relay service
3. Deploy passkey contracts via [passkey-kit](https://github.com/kalepail/passkey-kit)

When enabled, users will see a "Claim with Passkey (beta)" option on the envelope opening screen.

### Backend API Quick Demo

```bash
# 1. Install and start the backend
npm install
npm run server:dev

# 2. Create an envelope
curl -X POST http://localhost:4000/api/envelope/create \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON",
    "asset": "USDC",
    "amount": "25.00",
    "message": "Happy Birthday!",
    "expiresInMinutes": 1440
  }'

# Save the response: id, unsignedXDR, openUrl, preimage

# 3. Sign and submit unsignedXDR via Stellar Laboratory or wallet

# 4. Confirm funding
curl -X POST http://localhost:4000/api/envelope/fund \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<ENVELOPE_ID>",
    "txId": "<STELLAR_TX_HASH>"
  }'

# 5. Share openUrl with recipient (keep preimage secret!)

# 6. Recipient opens (extract token from openUrl query param)
curl -X POST "http://localhost:4000/api/envelope/open?t=<JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<ENVELOPE_ID>",
    "recipient": "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA",
    "preimage": "<PREIMAGE_FROM_SENDER>",
    "wantAsset": "USDC"
  }'
```

### 1. Install Dependencies

```bash
# Install Rust target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli

# Install Node dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 2. Deploy Smart Contracts

```bash
# Set environment variable for Reflector oracle
export REFLECTOR_FX_CONTRACT=CBWH7BWBMWGGWWVPC7K5P4H3PXVQS2EZAGTQYJJW4IDDQGOAJVDMVUVN

# Deploy envelope contract (legacy)
./scripts/deploy_envelope.sh

# Deploy escrow contract (new)
tsx scripts/deploy_escrow.ts
# This will automatically update your .env with ESCROW_CONTRACT_ID

# Fund test accounts
./scripts/fund_testnet.sh

# Create test envelope (replace with actual values)
./scripts/create_envelope.sh CONTRACT_ID RECIPIENT ASSET_ID 1000000 0
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and set:
# - VITE_ENVELOPE_CONTRACT (from deployment)
# - VITE_SOROBAN_RPC_URL
# - VITE_NETWORK_PASSPHRASE
# - VITE_USDC and VITE_WXLM token contracts
# - RESEND_API_KEY (optional)
```

### 4. Start Services

```bash
# Terminal 1: Start backend server
cd server
cp .env.example .env
npm run migrate
npm run dev

# Terminal 2: Start Outbox worker (for async jobs)
npm run outbox-worker

# Terminal 3: Start frontend
npm run dev
```

Visit http://localhost:5173

## Testing

### Contract Tests
```bash
# Test envelope contract
cargo test -p envelope

# Test escrow contract
npm run test:contracts
```

### Backend Tests
```bash
# Run all backend tests
npm run test:server

# Run specific test suites
npm test gift.test.ts
npm test escrow.integration.test.ts
```

### Frontend Tests
```bash
npm test
```

### Smoke Tests
```bash
# Start server first
npm run server:dev

# Run smoke tests
npm run smoke:endpoints
```

## API Endpoints

### Gift Management (NEW - Unified API)
- `POST /api/gift` - Create gifts in SINGLE, MULTI, or POOL mode
- `GET /api/gift/:id` - Get gift details (envelope, pool, or QR code)
- `GET /api/gift/pool/:qrCodeId/claim` - Claim from a pool

### Envelope Management (Legacy)
- `POST /api/envelope/create` - Create new envelope (deprecated - use /api/gift)
- `POST /api/envelope/fund` - Confirm on-chain funding
- `POST /api/envelope/open` - Claim with preimage (fee-sponsored)
- `POST /api/envelope/:id/refund` - Manually trigger refund for escrow

### Price Feeds (Reflector Network)
- `GET /api/prices` - Get current USD prices for assets
  - Query params: `symbols=XLM,USDC,AQUA` (optional, defaults to all supported)
  - Returns: `[{ symbol, priceUsd, updatedAt }]`
  - Features: 10s cache, zod validation, automatic fallbacks
- `GET /api/prices/single/:symbol` - Get price for single asset
- `GET /api/prices/health` - Check price service status
- `POST /api/envelope/cancel` - Cancel expired envelope

### Wallet & Balances
- `GET /api/wallet/balances/:account` - Get wallet balances (returns { ok, account, xlm, balances[] })

### Rates & Prices
- `GET /api/rates/spot?base=XLM&quote=USD` - Get price rates (Reflector-ready with CoinGecko fallback)

### Studio/Rewards
- `GET /api/studio/me?wallet=G...` - Get user profile and KM
- `POST /api/km/award` - Award karma points

### Webhooks
- `POST /hooks/reflector` - Reflector oracle callbacks
- `POST /notify/envelope-funded` - Email notification trigger
- `POST /api/webhooks/escrow` - Soroban event listener for escrow claims/refunds
- `GET /api/webhooks/escrow/health` - Webhook listener health check

### Health
- `GET /api/health` - Health check with service status (DB/Horizon/RPC)

See [API Documentation](docs/api.md) for detailed request/response formats.

## Contract Methods

### Envelope Contract

#### `init(reflector_fx: Address)`
Initialize contract with oracle address.

#### `create_envelope(...) -> u64`
Create and fund an envelope:
- `creator`: Funding wallet address
- `recipient`: Recipient wallet address  
- `asset`: Token contract address
- `amount_in`: Amount in token units
- `denom`: Currency denomination (USD)
- `expiry_secs`: Expiration time (0 = never)

#### `open_envelope(recipient: Address, id: u64) -> i128`
Open envelope and receive USD value.

#### `refund_after_expiry(creator: Address, id: u64)`
Refund expired envelope to creator.

## Project Structure

```
NovaGift/
├── contracts/
│   └── envelope/           # Soroban smart contract
│       ├── src/
│       │   ├── lib.rs     # Main contract logic
│       │   ├── reflector.rs # Oracle integration
│       │   └── tests.rs   # Contract tests
│       └── Cargo.toml
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.ts       # Express API
│   │   ├── db.ts          # Database layer
│   │   └── migrate.ts     # Schema setup
│   └── package.json
├── src/                    # React frontend
│   ├── pages/             # Application pages
│   ├── components/        # UI components
│   ├── lib/               # Utilities
│   │   ├── wallet.ts      # Freighter integration
│   │   └── soroban.ts     # Contract calls
│   └── hooks/             # React hooks
├── scripts/               # Deployment scripts
└── .env.example          # Environment template
```

## Deployment Checklist

- [ ] Set REFLECTOR_FX_CONTRACT environment variable
- [ ] Deploy envelope contract to testnet
- [ ] Fund creator/recipient accounts
- [ ] Configure frontend environment variables
- [ ] Start backend server with database
- [ ] Test create → fund → open flow
- [ ] Verify KM rewards accumulation
- [ ] Test email notifications (if configured)

## Security Considerations

- Price staleness checks (60 second threshold)
- Single-open guard prevents double spending
- Expiry mechanism for unclaimed envelopes
- Fixed-point arithmetic for overflow protection
- Token approval required before envelope creation

## Auth & KALE Gating

### SEP-10 Authentication
- **Real wallet auth:** Uses SEP-10 standard via Freighter
  - `/auth/sep10/challenge` → returns challenge XDR (server-signed)
  - Client signs with `@stellar/freighter-api`, then:
  - `/auth/sep10/verify` → issues JWT tied to wallet (sub = G...).

### KALE Hold-to-Unlock Skins
- **JWT-protected endpoints:**
  - `GET /api/kale/eligibility` → { holdings, eligible, rules }
  - `POST /api/kale/redeem-kale-gated` → unlocks if holdings ≥ threshold
- **Environment variables:**
  - `KALE_CONTRACT_ID` - KALE token contract address
  - `KALE_FAKE_BALANCE` - Use fake balances for testing
  - `WEB_AUTH_HOME_DOMAIN`, `WEB_AUTH_DOMAIN`, `WEB_AUTH_SERVER_SECRET`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/DomNav/NovaGift
- Discord: [Join our community]

---

Built with ❤️ for the Soroban hackathon
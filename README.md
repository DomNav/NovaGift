# NovaGift - Blockchain Gift Envelopes

NovaGift is a decentralized platform for sending cryptocurrency gifts through digital envelopes on the Stellar/Soroban network. Recipients see the USD value of their gift at the moment it was funded, regardless of market fluctuations.

## Architecture

### Smart Contracts (Soroban)
- **Envelope Contract**: Core logic for creating and opening gift envelopes
- **Reflector Integration**: Oracle access for USD price feeds
- **Token Support**: SAC-compliant tokens (USDC, wXLM)

### Backend (Node.js/TypeScript)
- **KM/Rewards API**: Track user karma and rewards
- **Email Notifications**: Resend integration for envelope claims
- **SQLite Database**: Persistent storage for user profiles

### Frontend (React/TypeScript)
- **Wallet Integration**: Freighter wallet support
- **Interactive UI**: Animated envelope reveals
- **Studio Mode**: Custom skins and personalization

## Prerequisites

- Node.js 18+ and npm/pnpm
- Rust 1.70+ with wasm32-unknown-unknown target
- Soroban CLI
- Stellar Freighter wallet extension

## Quick Start

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

# Deploy envelope contract
./scripts/deploy_envelope.sh

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

# Terminal 2: Start frontend
npm run dev
```

Visit http://localhost:5173

## Testing

### Contract Tests
```bash
cargo test -p envelope
```

### Frontend Tests
```bash
npm test
```

## API Endpoints

### Studio/Rewards
- `GET /api/studio/me?wallet=G...` - Get user profile and KM
- `POST /api/km/award` - Award karma points

### Webhooks
- `POST /hooks/reflector` - Reflector oracle callbacks
- `POST /notify/envelope-funded` - Email notification trigger

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

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/DomNav/NovaGift
- Discord: [Join our community]

---

Built with ❤️ for the Soroban hackathon
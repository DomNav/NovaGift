# NovaGift Project Memory

## Project Overview
**Name**: NovaGift  
**Type**: Blockchain Gift Envelope Platform  
**Network**: Stellar/Soroban Testnet  
**Status**: Implementation Complete (Aug 22, 2025)  
**Deadline**: September 1, 2025  

## Architecture Summary

### Smart Contracts (Soroban)
- **Language**: Rust with Soroban SDK 21.4.0
- **Main Contract**: Envelope (`/contracts/envelope/`)
  - Create, open, and refund gift envelopes
  - Historical USD pricing via Reflector oracle
  - Event emission for indexing
  - Expiry and refund mechanisms

### Backend (Node.js/TypeScript)
- **Framework**: Express with TypeScript
- **Database**: SQLite3 with better-sqlite3
- **Location**: `/server/`
- **Features**:
  - KM (Karma) rewards system
  - User profiles and activity tracking
  - Webhook endpoints for oracle updates
  - Email notifications via Resend

### Frontend (React/TypeScript)
- **Framework**: React 18.3 with Vite
- **Styling**: TailwindCSS with Radix UI
- **State**: Zustand stores
- **Location**: `/src/`
- **Features**:
  - 6 main pages (Create, Fund, Open, Activity, Studio, Settings)
  - Freighter wallet integration
  - Animated envelope reveals
  - Custom skins and themes
  - Real-time price conversion

## Implementation Details

### Completed Components (Aug 22, 2025)

#### 1. Smart Contracts ✅
```
/contracts/envelope/
├── Cargo.toml         # Soroban SDK 21.4.0
├── src/
│   ├── lib.rs        # Main contract logic
│   ├── reflector.rs  # Oracle integration
│   └── tests.rs      # Comprehensive test suite
```

**Key Methods**:
- `init(reflector_fx: Address)` - Initialize with oracle
- `create_envelope(...)` - Create and fund envelope
- `open_envelope(id)` - Open and reveal USD value
- `refund_after_expiry(id)` - Refund expired envelopes

#### 2. Deployment Scripts ✅
```
/scripts/
├── soroban-env.sh       # Environment setup
├── deploy_envelope.sh   # Contract deployment
├── create_envelope.sh   # Envelope creation
├── open_envelope.sh     # Envelope claiming
└── fund_testnet.sh      # Testnet funding
```

#### 3. Backend Service ✅
```
/server/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── db.ts         # Database layer
    ├── index.ts      # Express API
    └── migrate.ts    # Schema migrations
```

**API Endpoints**:
- `GET /api/studio/me?wallet=G...` - User profile
- `POST /api/km/award` - Award karma points
- `POST /hooks/reflector` - Oracle webhooks
- `POST /notify/envelope-funded` - Email notifications

#### 4. Frontend Integration ✅
```
/src/
├── lib/
│   ├── wallet.ts     # Freighter integration
│   └── soroban.ts    # Contract interactions
├── hooks/
│   ├── useWallet.ts  # Wallet management
│   └── useEnvelope.ts # Contract operations
└── pages/
    ├── Create.tsx    # Envelope creation
    ├── Fund.tsx      # QR funding
    ├── Open.tsx      # Envelope reveal
    ├── Activity.tsx  # Transaction history
    ├── Studio.tsx    # Skin customization
    └── Settings.tsx  # App preferences
```

## Technical Specifications

### Contract Storage
- **DataKey**: NextId, Envelope(u64)
- **EnvelopeData**: Stores all envelope metadata
- **Events**: EnvelopeCreated, EnvelopeOpened

### Security Features
- Price staleness checks (60-second threshold)
- Single-open enforcement
- Overflow-safe arithmetic (mul_div)
- Auth requirements (require_auth)
- Expiry-based refunds

### Token Support
- USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- wXLM: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Reflector FX: `CBWH7BWBMWGGWWVPC7K5P4H3PXVQS2EZAGTQYJJW4IDDQGOAJVDMVUVN`

## Environment Configuration

### Required Variables
```env
# Chain
NETWORK=testnet
REFLECTOR_FX_CONTRACT=<oracle_address>
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_ENVELOPE_CONTRACT=<deployed_contract>

# Tokens
VITE_USDC=<usdc_contract>
VITE_WXLM=<wxlm_contract>

# Server
PORT=4000
DATABASE_PATH=./data/app.db
RESEND_API_KEY=<optional>
```

## Testing Status

### Current State (Aug 22, 2025)
- ✅ **Frontend**: Running successfully on port 5178
- ✅ **Contract Code**: Complete with tests
- ✅ **Scripts**: Ready for deployment
- ⚠️ **Contract Tests**: Require Linux/Mac or WSL (Windows linker issue)
- ⚠️ **Backend**: Requires build tools for SQLite

### Test Commands
```bash
# Contract tests
cargo test -p envelope

# Frontend
npm run dev

# Backend
cd server && npm run dev

# Deploy contract
./scripts/deploy_envelope.sh
```

## Development Timeline

### Completed (Aug 22)
- [x] Contract implementation with Reflector oracle
- [x] Comprehensive test suite with mocks
- [x] All deployment scripts
- [x] Backend KM/rewards API
- [x] Frontend wallet integration
- [x] Contract interaction hooks
- [x] Project documentation

### Pending for Production
- [ ] Deploy to Stellar testnet
- [ ] Connect real Reflector oracle
- [ ] Test end-to-end flow
- [ ] Configure Resend for emails
- [ ] Production build optimization

## Key Decisions Made

1. **Soroban SDK 21.4.0**: Stable version for hackathon
2. **soroban-client**: Used for frontend (lighter than stellar-sdk)
3. **Single-call funding**: Token transfer in create_envelope
4. **Historical USD**: Price locked at creation time
5. **SQLite database**: Simple persistence for hackathon
6. **Freighter wallet**: Primary wallet integration

## Known Issues

1. **Windows Build Tools**: Requires Visual Studio C++ tools for local testing
2. **Multiple Vite Instances**: Ports 5173-5178 in use
3. **better-sqlite3**: Needs node-gyp for compilation

## Contact & Resources

- **GitHub**: Implementation ready for submission
- **Documentation**: README.md with full runbook
- **Status**: IMPLEMENTATION_STATUS.md for verification
- **Deadline**: Sept 1, 2025 (9 days remaining)

---

*Last Updated: August 22, 2025, 18:15 EST*  
*Implementation by: Opus 4.1 & GPT-5 collaboration*
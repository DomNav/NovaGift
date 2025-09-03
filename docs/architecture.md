# NovaGift Architecture Overview

## System Architecture

NovaGift is a blockchain gift envelope platform built on Stellar/Soroban that enables sending cryptocurrency gifts through digital envelopes with USD value preservation.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Vite + TypeScript + TailwindCSS                          │
│  - Stellar Wallets Kit Integration                          │
│  - React Query for Server State                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS API
┌────────────────────▼────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Express API Server                     │    │
│  │  - JWT Authentication (SEP-10)                     │    │
│  │  - Zod Validation                                  │    │
│  │  - Rate Limiting                                   │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                     │
│  ┌────────────────────▼───────────────────────────────┐    │
│  │              Service Layer                         │    │
│  │  - GiftService (Unified Gift Creation)            │    │
│  │  - WalletService (Multi-wallet Support)           │    │
│  │  - ReflectorService (Price Oracle)                │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                     │
│  ┌────────────────────▼───────────────────────────────┐    │
│  │         Outbox Pattern Worker                      │    │
│  │  - Durable Side-effects                           │    │
│  │  - Email Sending (Resend)                         │    │
│  │  - Escrow Funding                                 │    │
│  │  - Retry Logic & Exponential Backoff              │    │
│  └────────────────────┬───────────────────────────────┘    │
└───────────────────────┼─────────────────────────────────────┘
                       │
┌───────────────────────▼─────────────────────────────────────┐
│                   Data Layer                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            SQLite Database (Prisma ORM)             │   │
│  │  - Envelope, Wallet, Profile, Outbox               │   │
│  │  - QrCode, QrEvent (Pool Management)               │   │
│  │  - EmailInvite (Email Recipients)                  │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                       │
┌───────────────────────▼─────────────────────────────────────┐
│              Blockchain Layer (Stellar/Soroban)             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Escrow Smart Contract                      │   │
│  │  - Hold funds until claim or expiry                 │   │
│  │  - Recipient hash verification                     │   │
│  │  - Automatic refunds after expiry                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Stellar Network                            │   │
│  │  - XLM and USDC token transfers                    │   │
│  │  - Transaction fee sponsorship                     │   │
│  │  - Soroban RPC for contract calls                  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Gift Service (`/server/src/services/gift.ts`)
The unified service that handles all gift creation modes:
- **SINGLE**: One-off envelope to a single recipient
- **MULTI**: Multiple envelopes with amount split among recipients  
- **POOL**: QR code-based pool for multiple claimants

### 2. Outbox Pattern (`/server/src/jobs/outbox.ts`)
Ensures reliable execution of side-effects:
- Email sending with retry logic
- Blockchain transactions (escrow funding)
- Webhook event processing
- Future: NFT minting, push notifications

### 3. Escrow Contract (`/contracts/escrow/`)
Soroban smart contract that:
- Holds funds securely until claimed
- Verifies recipient using SHA256 hash
- Automatically refunds after expiry
- Emits events for state synchronization

### 4. Wallet Model
Multi-wallet support per user:
- HOT wallets (browser extensions like Freighter)
- HARDWARE wallets (future: Ledger support)
- CONTRACT wallets (future: smart wallets)

## Data Flow

### Gift Creation Flow
```
1. User Request → POST /api/gift
2. GiftService validates and creates envelope(s)
3. Database transaction:
   - Create Envelope record(s)
   - Create EmailInvite (if email recipient)
   - Queue ESCROW_FUND job to Outbox
   - Queue EMAIL_SEND job (if needed)
4. Return gift details to user
5. Outbox Worker processes jobs:
   - Funds escrow on blockchain
   - Sends email notifications
   - Updates envelope status
```

### Claim Flow
```
1. Recipient clicks claim link or scans QR
2. Authenticate via wallet (SEP-10)
3. Build claim transaction with preimage
4. Submit to escrow contract
5. Contract verifies hash(recipient + preimage)
6. Funds transferred to recipient
7. Webhook updates envelope status to OPENED
```

### Pool Claim Flow
```
1. User scans pool QR code
2. GET /api/gift/pool/:qrCodeId/claim
3. Find next available envelope in pool
4. Reserve envelope for claimer
5. Return envelope details with preimage
6. Standard claim flow continues
```

## Key Design Decisions

### 1. Outbox Pattern for Reliability
All side-effects go through the Outbox table to ensure:
- No lost emails during crashes
- Automatic retry with exponential backoff  
- Idempotent operations
- Distributed processing support

### 2. Escrow for Security
Funds are held in smart contracts rather than hot wallets:
- Trustless claiming process
- Automatic refunds on expiry
- No central point of failure
- Transparent on-chain state

### 3. Hash-based Recipient Verification
Recipients are identified by SHA256(address + secret):
- Privacy: recipient address not stored on-chain
- Security: only intended recipient can claim
- Flexibility: supports email recipients who get wallet later

### 4. Pre-created Pool Envelopes
Pools pre-create all envelopes at creation time:
- Predictable gas costs
- Fair distribution (no race conditions)
- Simple claim process
- Easy tracking of remaining claims

## Security Considerations

### Authentication
- SEP-10 for wallet authentication
- JWT sessions with expiry
- Rate limiting on sensitive endpoints

### Data Protection
- Preimages never logged
- Sensitive data encrypted in database
- HMAC verification for webhooks
- Parameterized queries (via Prisma)

### Blockchain Security
- Contract admin for emergency refunds
- Expiry enforcement
- Hash verification for claims
- Fee sponsorship to prevent user confusion

## Scalability

### Horizontal Scaling
- Stateless API servers
- Multiple Outbox workers with distributed locking
- Database connection pooling
- CDN for static assets

### Performance Optimizations
- Batch operations for MULTI mode
- Staggered job processing for pools
- Indexed database queries
- Caching for price oracle data

## Monitoring & Observability

### Health Checks
- `/api/health` - API server status
- `/api/webhooks/escrow/health` - Webhook listener
- Outbox worker logs with job metrics

### Error Handling
- Structured error responses
- Outbox retry tracking
- Failed job isolation
- Detailed logging without sensitive data

## Future Enhancements

### Planned Features
- [ ] NFT minting on claim (infrastructure ready)
- [ ] Push notifications via FCM
- [ ] Hardware wallet support
- [ ] Multi-chain support (Polygon, etc.)
- [ ] Advanced analytics dashboard
- [ ] Recurring gifts / subscriptions

### Architecture Extensions
- GraphQL API layer
- WebSocket for real-time updates
- Redis for caching and sessions
- Kubernetes deployment manifests
- Event sourcing for audit trail

## Development Setup

See [README.md](../README.md) for detailed setup instructions.

Key environment variables:
- `ESCROW_CONTRACT_ID` - Deployed escrow contract
- `SOROBAN_RPC_URL` - Stellar RPC endpoint
- `RESEND_API_KEY` - Email service credentials
- `DATABASE_URL` - SQLite connection string

## Testing Strategy

### Unit Tests
- Service layer logic
- Contract functions
- Utility functions

### Integration Tests  
- API endpoints
- Database operations
- Outbox worker flows

### E2E Tests
- Complete gift flows
- Wallet interactions
- Email delivery

## Deployment

### Infrastructure Requirements
- Node.js 18+ server
- SQLite database (or PostgreSQL for production)
- Stellar testnet/mainnet access
- Email service (Resend)
- SSL certificates

### Deployment Process
1. Build contracts: `cargo build --release`
2. Deploy contracts: `tsx scripts/deploy_escrow.ts`
3. Run migrations: `npx prisma migrate deploy`
4. Start services:
   - API server: `npm run server:dev`
   - Outbox worker: `npm run outbox-worker`
   - Frontend: `npm run dev`

---

*Last Updated: September 2025*
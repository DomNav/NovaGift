# Changelog

All notable changes to NovaGift will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-09-03

### Added

#### Smart Contracts
- ✅ **Escrow Contract** (`/contracts/escrow/`) - Trustless fund holding on Soroban
  - Automatic refunds after expiry
  - Hash-based recipient verification
  - Admin emergency refund capability
  - Event emission for state tracking
  - Deployment script with auto-configuration

#### Backend Services
- ✅ **Unified Gift Service** (`/server/src/services/gift.ts`) - Single service for all gift modes
  - SINGLE mode: One-off gifts to individual recipients
  - MULTI mode: Split amounts among multiple recipients
  - POOL mode: QR code-based pools for door-crasher claiming
  - Email and wallet recipient support

- ✅ **Outbox Pattern** (`/server/src/jobs/outbox.ts`) - Durable side-effect processing
  - Reliable email delivery with retry logic
  - Blockchain transaction queue
  - Exponential backoff for failures
  - Distributed worker support

- ✅ **Multi-Wallet Model** - Support for multiple wallets per user
  - Wallet types: HOT, HARDWARE, CONTRACT
  - Primary wallet selection
  - Migration scripts for existing data

#### API Endpoints
- ✅ `POST /api/gift` - Unified gift creation endpoint
- ✅ `GET /api/gift/:id` - Retrieve gift details
- ✅ `GET /api/gift/pool/:qrCodeId/claim` - Claim from pools
- ✅ `POST /api/envelope/:id/refund` - Manual escrow refunds
- ✅ `POST /api/webhooks/escrow` - Soroban event listener
- ✅ `GET /api/webhooks/escrow/health` - Webhook health check

#### Testing
- ✅ Escrow contract tests (`/contracts/escrow/tests/`)
- ✅ Gift service unit tests (`/server/src/__tests__/gift.test.ts`)
- ✅ Gift API integration tests (`/server/src/__tests__/gift.integration.test.ts`)
- ✅ Escrow integration tests (`/server/src/__tests__/escrow.integration.test.ts`)
- ✅ Outbox worker tests (`/server/src/__tests__/outbox.spec.ts`)

### Changed
- 🔄 **Email Delivery** - Migrated to Outbox pattern
  - All emails now queued for reliable delivery
  - No direct Resend API calls in routes
  - Automatic retry on failures

- 🔄 **API Structure** - Unified gift creation
  - `/api/envelope/create` deprecated (use `/api/gift`)
  - Consistent response formats
  - Better error messages

### Improved
- 📚 **Documentation**
  - Complete architecture overview (`/docs/architecture.md`)
  - Updated README with new setup instructions
  - Enhanced PROJECT_MEMORY.md with implementation history

- 🛡️ **Security**
  - Funds held in escrow contracts (not hot wallets)
  - HMAC webhook signature verification
  - Input validation with Zod schemas

### Infrastructure
- ✅ `npm run outbox-worker` - Async job processor
- ✅ `npm run test:contracts` - Run contract tests
- ✅ `tsx scripts/deploy_escrow.ts` - Deploy escrow contract

## [v0.1.0-demo-a] - 2025-08-26

### Added

#### Backend
- ✅ Wallet balances endpoint (`/api/wallet/balances/:account`) - Query wallet balances from Horizon
- ✅ Price rates endpoint (`/api/rates/spot`) - Get XLM/USD rates with CoinGecko fallback (Reflector-ready)
- ✅ Health check endpoint (`/api/health`) - Monitor service status (DB/Horizon/RPC)
- ✅ Smoke tests for wallet balances and rates endpoints

#### Frontend
- ✅ BalancesChip component - Display wallet balances with refresh capability
- ✅ PriceChip component - Show live XLM/USD price with 15s auto-refresh
- ✅ HealthChip component - Monitor system health status
- ✅ useBalances hook - Manage wallet balance state

#### Configuration
- ✅ Added `VITE_API_BASE` environment variable for client API configuration
- ✅ Added smoke test scripts to package.json

### Changed
- Updated health endpoint to include detailed service status monitoring
- Enhanced README with new API documentation and smoke test instructions

### Technical Notes
- Reflector integration prepared but not yet active (controlled by `ENABLE_REFLECTOR` flag)
- Maintaining `ENABLE_FAKE_MODE=true` for envelope flows until Soroban contracts are fully wired

## [Previous Releases]

### Features in Development
- HTLC-based secure envelopes with preimage/hash claiming
- JWT-signed one-time links with 30-minute expiry
- Fee sponsorship for recipients
- SEP-10 Authentication via Freighter
- KALE Token Gating for premium skins
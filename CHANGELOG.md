# Changelog

All notable changes to NovaGift will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
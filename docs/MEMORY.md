# NovaGift Memory

## Project State

[2025-08-26] Backend routes added: /api/wallet/balances/:account, /api/rates/spot, /api/health.
Frontend chips: BalancesChip, PriceChip, HealthChip mounted in header. 
Next: Reflector contract/api integration; enable ENABLE_REFLECTOR + REFLECTOR_MODE.
Flag: Keep ENABLE_FAKE_MODE for envelope flows until real Soroban wired.

## Key Configurations

- **Database**: SQLite (file:./novagift.db)
- **Authentication**: SEP-10 with Freighter
- **Network**: Stellar Testnet
- **Fee Sponsorship**: Enabled
- **KALE Token Gating**: Active

## Recent Changes

- Added wallet balance endpoint with Horizon integration
- Implemented price rates endpoint with CoinGecko fallback (Reflector-ready)
- Created health check endpoint monitoring DB/Horizon/RPC status
- Added frontend chips for displaying balances, prices, and health status
- Implemented smoke tests for wallet and rates endpoints

## Environment Variables

Critical environment variables:
- `HORIZON_URL`: Stellar Horizon endpoint
- `SOROBAN_RPC_URL`: Soroban RPC endpoint
- `VITE_API_BASE`: Client API base URL
- `ENABLE_REFLECTOR`: Flag for Reflector integration (currently false)
- `ENABLE_FAKE_MODE`: Flag for mock mode (currently true)

## Integration Points

- **Horizon API**: Used for wallet balance queries
- **CoinGecko API**: Fallback price source for XLM/USD
- **Reflector Oracle**: Prepared for integration (not yet active)
- **Soroban RPC**: Ready for smart contract interactions

## Testing

Smoke tests available:
- `npm run smoke:wallet`: Tests wallet balance endpoint
- `npm run smoke:rates`: Tests price rates endpoint
- `npm run smoke:endpoints`: Runs all smoke tests

## Next Steps

1. Enable Reflector integration when ready
2. Disable ENABLE_FAKE_MODE once Soroban contracts are wired
3. Implement email notifications via Resend
4. Add user karma and rewards system
5. Complete Studio mode customization
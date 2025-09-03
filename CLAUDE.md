<!-- CLAUDE: DO NOT EDIT BELOW -->
<!-- START CUSTOM: Init Banner -->
## 🔔 Init Confirmation (Custom Section — Preserve on /init)

When `/init` runs, confirm:

**NovaGift Guardrails Loaded ✅**

Active modes:
- UltraThink reasoning
- Map-Reduce for large edits
- Self-Review + Critic Pass
- Auto-Doc comments
- Lint-first validation
- Project Memory updates

Available quick commands:
- `/ultra`
- `/critic`
- `/summarize`
<!-- END CUSTOM: Init Banner -->
<!-- CLAUDE: DO NOT EDIT ABOVE -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NovaGift** - A blockchain gift envelope platform on Stellar/Soroban for sending cryptocurrency gifts through digital envelopes with USD value preservation.

## Critical Commands

### Development
```bash
# Install dependencies (use pnpm preferred)
pnpm install

# Frontend development (Vite on port 5173)
pnpm dev

# Backend development (Express on port 4000)
pnpm server:dev

# Outbox worker (background job processor)  
pnpm outbox-worker

# Full validation before commit
pnpm typecheck && pnpm lint && pnpm build
```

### Testing
```bash
# Unit tests (Vitest)
pnpm test                # Run once
pnpm test:watch          # Watch mode
pnpm test:coverage       # With coverage
pnpm test src/path/to/test.test.ts  # Single test file

# E2E tests (Playwright - requires both frontend and backend running)
npx playwright test      # Run all
npx playwright test --ui # Interactive UI
npx playwright test tests/e2e/specific.spec.ts # Specific test

# Backend tests
pnpm test:server         # Server tests
pnpm test:contracts      # Rust contract tests (requires Linux/Mac/WSL)

# Smoke tests (requires server running)
pnpm smoke:endpoints     # All endpoint tests
pnpm smoke:wallet        # Wallet endpoints
pnpm smoke:rates         # Rate endpoints
```

### Database
```bash
# Prisma commands
npx prisma generate      # Generate client after schema changes
npx prisma migrate dev --name <name>  # Create migration
npx prisma studio        # Open GUI at localhost:5555
npx prisma migrate reset # Reset database
```

### Background Jobs
```bash
pnpm outbox-worker       # Process queued operations
pnpm retention           # Clean old data
```

### Load Testing
```bash
# GitHub Actions
gh workflow run load-test.yml

# Local with k6
k6 run --vus 5 --duration 30s tests/load/gift-load.js
```

### Build & Production
```bash
# Build frontend (outputs to /dist)
pnpm build

# Preview production build
pnpm preview

# Build server TypeScript
cd server && pnpm build

# Start production server
cd server && pnpm start
```

## Architecture & Key Patterns

### Monorepo Structure
- **Frontend** (`/src`): React 18 + Vite + TypeScript + TailwindCSS + Radix UI
  - Pages in `/src/pages/`
  - Components in `/src/components/`
  - Hooks in `/src/hooks/`
  - Stores (Zustand) in `/src/stores/`

- **Backend** (`/server`): Express + TypeScript + Prisma + SQLite
  - Routes in `/server/src/routes/`
  - Services in `/server/src/services/`
  - Middleware in `/server/src/middleware/`
  - Jobs in `/server/src/jobs/`

- **Smart Contracts** (`/contracts`): Rust + Soroban SDK 21.4.0

- **E2E Tests** (`/tests/e2e`): Playwright

- **Load Tests** (`/tests/load`): k6 performance testing

### Core Integrations
- **Wallet**: Stellar Wallets Kit (Freighter, Albedo, xBull)
- **Database**: SQLite with Prisma ORM  
- **Authentication**: SEP-10 wallet auth + JWT sessions
- **Email**: Resend API for notifications
- **Monitoring**: Prometheus metrics at /metrics
- **Feature Flags**: Database-driven with context evaluation

### Blockchain Patterns
- **Transaction Flow**: Build unsigned XDR server-side → client signs → submit
- **Fee Sponsorship**: Recipients pay zero fees
- **Price Oracle**: Reflector integration for USD conversion  
- **Networks**: Testnet default, configurable via env

### API Design
- **Validation**: Zod schemas at all boundaries
- **Response Format**: `{ ok: boolean, data?: T, error?: string }`
- **Rate Limiting**: express-rate-limit on sensitive endpoints
- **HMAC Verification**: Webhook security middleware

### Key Environment Variables
```env
# Core (required)
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
DATABASE_URL=file:./novagift.db

# Contract IDs (deploy-dependent)
NOVAGIFT_CONTRACT_ID=
KALE_CONTRACT_ID=
SOROSWAP_ROUTER_ID=

# Security (change in production)
JWT_SECRET=
LINK_SIGNING_KEY=
WEB_AUTH_SERVER_SECRET=

# Optional features
ENABLE_AMM=false
ENABLE_PASSKEYS=false
RESEND_API_KEY=
```

## TypeScript Configuration

### Frontend (`/tsconfig.json`)
- Target: ES2022
- Module: ESNext with bundler resolution
- Path alias: `@/*` → `src/*`
- Strict mode enabled

### Backend (`/server/tsconfig.json`)
- Target: ES2020
- Module: NodeNext
- JSX: react-jsx for email templates
- Includes: src, routes, lib, templates

## Common Development Tasks

### Adding a New API Endpoint
1. Define Zod schema in `/server/src/schemas/`
2. Create route handler in `/server/src/routes/`
3. Add to router in `/server/src/server.ts`
4. Update frontend API client in `/src/lib/api.ts`
5. Add React Query hook if needed in `/src/hooks/`

### Modifying Database Schema
1. Edit `/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <migration-name>`
3. TypeScript types auto-generate via `npx prisma generate`
4. Test with `npx prisma studio`

### Working with Stellar Transactions
1. Build XDR server-side using `@stellar/stellar-sdk`
2. Return unsigned XDR to client
3. Client signs with wallet (Freighter)
4. Submit signed XDR back to server or directly to network

### Updating Smart Contracts
1. Modify Rust code in `/contracts/escrow/src/`
2. Run `cargo test` to verify
3. Build with `cargo build --release`
4. Deploy using `scripts/deploy_escrow.ts`
5. Update contract ID in `.env`

## Important Files to Read First
- This file (CLAUDE.md)
- PROJECT_MEMORY.md - implementation history and decisions
- README.md - user-facing documentation
- VALIDATION_GUIDE.md - testing procedures
- Relevant feature files based on the task

## Key Components & Patterns

### Reusable Components
- **Envelope display**: `src/components/envelope/EnvelopePreview.tsx`
- **Link cards**: `src/components/LinkPreview/LinkStyleCard.tsx`
- **Analytics**: `src/components/StudioInsights.tsx`
- **Admin dashboard**: `src/components/admin/`

### Theming System
- **Tailwind config**: `tailwind.config.js` - colors and gradients
- **Skin definitions**: `src/lib/skins.ts` - per-skin gradients
- **Global styles**: `src/index.css` - fonts and base layer
- **UI primitives**: `src/components/ui/*` - Radix-based components

### State Management
- **Zustand stores**: `/src/stores/` - global client state
- **React Query**: SWR caching for server data
- **Local storage**: Custom hook in `src/hooks/useLocalStorage.ts`

## Troubleshooting

### Windows Build Issues
- Requires Visual Studio C++ Build Tools for better-sqlite3
- Use WSL for contract testing if native Windows fails

### Port Conflicts
- Frontend: 5173 (configurable in `vite.config.ts`)
- Backend: 4000 (via PORT env var)
- Prisma Studio: 5555
- Playwright expects frontend on 5173, backend on 4000

### Stellar Network Issues
- Check testnet status: https://horizon-testnet.stellar.org
- Verify network passphrase matches
- Ensure accounts funded via friendbot

## CI/CD & Validation

### PR Validation Workflow
```bash
# Local validation before PR
scripts/validate-pr.sh

# CI runs automatically on PR:
- TypeScript compilation
- Linting
- Unit tests
- E2E tests (if changes detected)
- Load tests (manual trigger)
```

### Monitoring & Metrics
- **Prometheus endpoint**: http://localhost:4000/metrics
- **Key metrics**: `outbox_*`, `gifts_*`, `http_*`
- **Test script**: `server/scripts/test-metrics.ts`

### Feature Flags
- **Seed flags**: `npx tsx server/scripts/seed-feature-flags.ts`
- **Evaluation endpoint**: `POST /api/feature-flags/evaluate`
- **Context-aware targeting**: user, percentage rollout

## Git Workflow
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- **Feature branches**: `feat/<feature-name>`
- **PR template**: `.github/pull_request_template.md`
- **Run tests before committing**

<!-- CLAUDE: DO NOT EDIT BELOW -->
<!-- START CUSTOM: Quick Commands -->
## Quick Commands (Custom Section — Preserve on /init)

### /ultra
You are Opus 4.1 running UltraThink, Map-Reduce, and Self-Review.  
Always:  
• Update PROJECT_MEMORY.md with a bullet summary of changes  
• Run a lint-first + critic pass before finalizing  
• Output unified diff if file edits are small, else full file  

### /critic
Review the last code you wrote as a senior engineer.  
Call out 1–2 mistakes or risks, and suggest 1 improvement for maintainability.  

### /summarize
Summarize the last N prompts into a commit message and a PROJECT_MEMORY.md bullet.  
<!-- END CUSTOM: Quick Commands -->
<!-- CLAUDE: DO NOT EDIT ABOVE -->



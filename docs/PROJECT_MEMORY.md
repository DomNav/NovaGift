# NovaGift Project Memory

## Change Log (for Claude bullets only)
- (2025-09-03) Added Wallet model & WalletType enum; backfilled Profile.wallet into Wallet; helper getPrimaryWallet(); tests green.
- (2025-09-04) Outbox table + worker added, retries = 5, tested locally.

---

## Project Overview
NovaGift is a crypto gifting application that allows users to create, send, and receive digital envelopes...



## Project Overview
NovaGift is a crypto gifting application that allows users to create, send, and receive digital envelopes containing cryptocurrency. The application features gamified elements, customizable skins, and a reward system.

## Technical Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (comprehensive component library)
- **Routing**: React Router DOM (in novagift/web)
- **State Management**: Zustand (in novagift/web)
- **Animations**: Motion library, Canvas Confetti
- **Icons**: Lucide React
- **Forms**: React Hook Form

### Backend
- **Server**: Express.js
- **Email Service**: Resend with React Email components
- **Encryption**: Crypto-JS

### Development Tools
- **TypeScript**: Full type safety
- **Testing**: Vitest with React Testing Library
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier

## Project Structure

```
NovaGift/
├── src/                     # Main application source
│   ├── components/          # Reusable components
│   │   ├── ui/             # Radix UI components (50+ components)
│   │   ├── figma/          # Figma-imported components
│   │   └── Various custom components
│   ├── views/              # Page views
│   ├── guidelines/         # Development guidelines
│   └── styles/             # Global styles
└── novagift/web/           # Alternative web implementation
    ├── src/
    │   ├── components/     # Component library
    │   ├── pages/          # Page components
    │   ├── store/          # Zustand stores
    │   ├── contexts/       # React contexts
    │   ├── hooks/          # Custom hooks
    │   └── lib/            # Utilities
    └── server/             # Backend services
```

## Implemented Features

### Core Components
1. **EnvelopeCard** - Digital envelope display component
2. **GradientShaderCard** - Animated gradient card with shader effects
3. **AnimatedButton** - Button with animation effects
4. **QRCard** - QR code display for sharing/receiving
5. **PriceBox** - Cryptocurrency price display
6. **ActivityRow** - Transaction/activity history display
7. **NavSidebar** - Navigation sidebar
8. **PageHeader** - Consistent page headers
9. **FormField** - Reusable form field component
10. **SuccessOverlay** - Success state overlay animations

### Page Views
1. **Activity** - Transaction history and activity feed
2. **CreateEnvelope** - Create new crypto envelopes
3. **Fund** - Fund envelopes with cryptocurrency
4. **OpenReveal** - Envelope opening/reveal animation
5. **KaleSkins** - Skin customization gallery

### Advanced Features (novagift/web)
1. **Theme System** - Dark/light mode with ThemeContext
2. **Toast Notifications** - Custom toast system
3. **Reward System** - Points and achievements (rewards.ts store)
4. **Skin Store** - Purchasable envelope skins (skins.ts store)
5. **Email Templates** - ClaimEmail template for notifications
6. **Wallet Integration** - Crypto wallet connection utilities
7. **Progress Pills** - Visual progress indicators
8. **Count Up Effects** - Animated number displays
9. **Envelope Open Effects** - Opening animations

### UI Component Library (Radix UI)
Complete implementation of 50+ UI components including:
- Forms (input, textarea, select, checkbox, radio)
- Overlays (dialog, sheet, popover, tooltip)
- Navigation (tabs, accordion, menu, sidebar)
- Data display (table, card, badge, avatar)
- Feedback (alert, progress, skeleton, toast)

## Current State

### Completed
- ✅ Full UI component library setup
- ✅ Two parallel implementations (main and novagift/web)
- ✅ Figma design integration
- ✅ Basic routing structure
- ✅ Theme system implementation
- ✅ Email notification system
- ✅ Removed unused experimental directories (Button effect, Gradient Shader Card)

### In Progress
- 🔄 Wallet integration completion
- 🔄 Backend API development
- 🔄 Testing setup and coverage

## Pending Tasks & Future Improvements

### High Priority
1. **Blockchain Integration**
   - Connect to Solana/Ethereum networks
   - Implement wallet connection (Phantom, MetaMask)
   - Smart contract deployment for envelope logic
   - Transaction signing and verification

2. **Backend Development**
   - API endpoints for envelope CRUD operations
   - User authentication system
   - Database schema design
   - Transaction history storage
   - Rate limiting and security

3. **Security**
   - Implement envelope encryption/decryption
   - Secure key management
   - Input validation and sanitization
   - CORS configuration
   - API authentication tokens

### Medium Priority
4. **Features Enhancement**
   - Multi-recipient envelopes
   - Scheduled sending
   - Envelope templates
   - Social sharing integration
   - Push notifications

5. **Performance Optimization**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Caching strategies
   - Bundle size reduction

6. **Testing**
   - Unit tests for components
   - Integration tests for flows
   - E2E testing setup
   - Performance testing

### Low Priority
7. **UI/UX Improvements**
   - More skin designs
   - Animation polish
   - Accessibility improvements
   - Mobile responsiveness fine-tuning
   - Loading states

8. **Analytics & Monitoring**
   - User analytics integration
   - Error tracking (Sentry)
   - Performance monitoring
   - A/B testing framework

## Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- Component-based architecture
- Consistent naming conventions
- Modular CSS with Tailwind

### Git Workflow
- Feature branches for new development
- PR reviews required
- Semantic commit messages
- Version tagging for releases

### Testing Requirements
- Unit tests for utilities
- Component testing for UI
- Integration tests for flows
- Manual QA before release

## Environment Setup

### Required Environment Variables
```
VITE_API_URL=
VITE_WALLET_NETWORK=
RESEND_API_KEY=
DATABASE_URL=
JWT_SECRET=
```

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start email notification server
npm run notify:dev
```

## Known Issues
1. Wallet connection not fully implemented
2. Email templates need responsive design
3. Some TypeScript types need refinement
4. Build warnings in console need addressing

## Resources
- [Figma Design](https://www.figma.com/design/vm9pQuoHVwQ8VM0HRUtwle/NovaGift-Crypto-Gifting-App)
- Radix UI Documentation
- Tailwind CSS Documentation
- Vite Documentation

## Contact & Support
For questions or issues, refer to the project repository or contact the development team.

---
*Last Updated: Current Session*
*Version: 0.1.0*

## Update Log

### PIPEDA-lite Compliance Implementation
- **What changed**: Added PIPEDA-lite data privacy controls for consent management and data retention
- **Files touched**:
  - `server/src/middlewares/consent.ts` - New consent middleware for profile data access
  - `server/src/jobs/retention.ts` - New retention job for automated data deletion/anonymization
  - `server/src/routes/profile.ts` - New profile routes with consent enforcement
  - `server/src/server.ts` - Updated to import consent middleware and profile routes
  - `package.json` - Added retention script command
- **New env/flags**: 
  - Header `x-wallet` used to identify users for consent checks
  - Consent enforcement on profile-accessing routes
  - `npm run retention` command for data retention job execution

### Vercel Deployment Configuration
- **What changed**: Configured NovaGift for Vercel serverless deployment with PostgreSQL
- **Files touched**:
  - `vercel.json` - New Vercel configuration with API routing and build settings
  - `api/serverless.ts` - New serverless handler wrapping Express app for Vercel
  - `prisma/schema.prisma` - Updated to PostgreSQL with Vercel adapter support
  - `DEPLOY.md` - New comprehensive deployment documentation
- **New env/flags**:
  - `DATABASE_URL` - Pooled PostgreSQL connection with `?pgbouncer=true`
  - `DIRECT_URL` - Direct PostgreSQL connection for migrations
  - `CORS_ORIGIN` - Frontend URL for CORS configuration
  - Vercel-specific build command: `npm install && npx prisma generate`

### Soroban HTLC Contract Refactoring
- **What changed**: Refactored NovaGift's Soroban HTLC-like contract for improved clarity, safety, and maintainability
- **Files touched**:
  - `contracts/envelope/src/lib.rs` - Refactored main contract with proper HTLC logic, Status enum, and event emissions
  - `contracts/envelope/src/oracle.rs` - New oracle module with ReflectorClient trait following Bachini pattern
  - `contracts/envelope/src/error.rs` - New error module with comprehensive contract error definitions
  - `contracts/envelope/src/tests.rs` - New comprehensive test suite covering happy path, wrong preimage, timeout refund, and security scenarios
- **New env/flags**:
  - HTLC-style operations: create, fund, open (with preimage), cancel (after timeout)
  - Oracle integration for price feeds with staleness checks
  - Comprehensive error handling with `#[contracterror]` attribute
  - Test coverage using `soroban-sdk::testutils`

### Repository Audit and Infrastructure Assessment
- **What changed**: Comprehensive audit of NovaGift repository state and infrastructure readiness
- **Files touched**:
  - `PATCHES/01_prisma_schema_decimals.diff` - Fix for Prisma decimal precision
  - `PATCHES/02_create_logger.diff` - New logger with sensitive data redaction
  - `PATCHES/03_create_error_middleware.diff` - Global error handling middleware
  - `PATCHES/04_server_package_scripts.diff` - Missing npm scripts for server
  - `PATCHES/05_envelope_route_use_db.diff` - Database integration for envelope routes
  - `AUDIT_REPORT.md` - Comprehensive audit report with 65% completion status
  - `TODO_NEXT.md` - Prioritized action items for manual setup and implementation
- **Key findings**:
  - Core infrastructure in place (Freighter, Reflector, Prisma schema, consent middleware)
  - Critical gaps: envelope routes still use MemoryStore, missing migrations, incorrect decimal precision
  - 15 of 23 checklist items passed
  - Patches prepared for immediate fixes to reach 85-90% completion
- **New env/flags**:
  - Identified need for DATABASE_URL configuration (SQLite for dev, PostgreSQL for production)
  - Missing CONTRACT_ID needs deployment or recovery
  - FEE_SPONSOR account required for testnet operations

### Fix Pack v1 Implementation
- **What changed**: Applied comprehensive fix pack to improve code quality, security, and maintainability
- **Files touched**:
  - `.env.example` - Updated with authoritative template containing all required environment variables
  - `server/src/config/env.ts` - New Zod-validated environment configuration module
  - `prisma/schema.prisma` - Fixed decimal precision mappings for Envelope, Profile, and SwapReceipt models
  - `server/src/routes/envelope.ts` - Replaced MemoryStore with Prisma database via envelopeRepo
  - `server/src/lib/log.ts` - New Pino logger with sensitive data redaction
  - `server/src/middleware/error.ts` - New global error handling middleware
  - `server/src/server.ts` - Wired httpLogger and errorMiddleware
  - `server/package.json` - Added lint, test, and retention scripts
  - `server/src/routes/envelope.smoke.spec.ts` - Added minimal smoke test
  - `.github/workflows/retention.yml` - New GitHub Action for daily retention job
- **New env/flags**:
  - DATABASE_URL - Required database connection string
  - POOLING - Boolean flag for connection pooling
  - Strict Zod validation for all environment variables
  - Improved JTI idempotency using Prisma Jti model
## Recent Feature Additions

### SEP-10 Auth & KALE Token Gating (2025-08-26 - 2025-08-27)
- **Decision:** Implemented full SEP-10 authentication with KALE token gating system
- **Rationale:** Production-ready wallet authentication using industry standards
- **Implementation:**
  - Server issues and verifies SEP-10 challenges with Freighter
  - JWT sessions tied to wallet public keys with 15-minute expiry
  - KALE holdings checked via read-only Soroban calls
  - Server-authoritative skin gating prevents client bypass
  - Complete notification system for wallet events
  - Reflector oracle integration for price feeds
  - Comprehensive test suites and CI/CD pipeline
- **Files touched:**
  - `server/src/lib/sep10.ts` - SEP-10 challenge issuing and verification
  - `server/src/lib/jwt.ts` - JWT minting and verification with secure algorithms
  - `server/src/middlewares/requireAuth.ts` - JWT authentication middleware
  - `server/src/routes/auth.ts` - SEP-10 challenge/verify endpoints
  - `server/src/lib/stellar-rpc-kale.ts` - KALE balance reading via Soroban
  - `server/src/lib/soroban-kale.ts` - KALE holdings helper with contract calls
  - `server/src/lib/reflector-oracle.ts` - Reflector price feed integration
  - `server/src/routes/kale-gating.ts` - KALE eligibility and redemption routes
  - `server/src/routes/kale-public.ts` - Public KALE-related endpoints
  - `server/src/routes/notifications.ts` - Notification management endpoints
  - `server/src/routes/wallet.ts` - Enhanced wallet balance and status endpoints
  - `server/src/config/skins.ts` - Skin configuration and KALE requirements
  - `src/lib/auth.ts` - Frontend Freighter authentication with SEP-10
  - `src/lib/session.ts` - Frontend JWT session management
  - `src/components/skins/SkinsGrid.tsx` - KALE skins UI component
  - `src/components/ui/NotificationButton.tsx` - Notification UI component
  - `src/components/ui/WalletBalancePill.tsx` - Wallet balance display
  - `src/components/ui/PaymentToggle.tsx` - Payment method selector
  - `src/hooks/useBalances.ts` - Enhanced balance hook with multi-asset support
  - `src/hooks/useNotifications.ts` - Notification management hook
  - `src/pages/KaleSkins.tsx` - Updated with real auth and skins grid
  - `server/tests/auth-sep10.test.ts` - Comprehensive SEP-10 auth tests
  - `server/tests/kale-gating.test.ts` - KALE gating logic tests
  - `.github/workflows/ci.yml` - CI/CD pipeline configuration
- **New Components:**
  - PriceTicker system with live updates from Reflector oracle
  - LuxuryLivePrices component for premium price displays
  - ExpandedTickerView for detailed price information
  - AuraPointsChip for rewards display
  - EnvelopeOpeningDemo for testing envelope animations
- **Configuration:**
  - `KALE_FAKE_BALANCE=true` for deterministic testing
  - Thresholds: 1/5/25/100 KALE for Common/Rare/Epic/Legendary
  - 15-minute JWT expiry for security
  - Reflector oracle integration for XLM/USD price feeds
  - Multiple notification channels supported
- **Testing:**
  - Full test coverage for SEP-10 authentication flow
  - KALE gating unit tests with threshold validation
  - Smoke tests for critical endpoints
  - CI/CD pipeline with automated testing
- **Future Considerations:**
  - Add hold duration requirements (e.g., must hold 7+ days)
  - Include staked KALE in balance calculations
  - Support multi-token requirements
  - Implement tiered rewards based on KALE holdings

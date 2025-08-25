# NovaGift Project Memory

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
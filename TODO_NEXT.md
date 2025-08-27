# NovaGift - TODO Next Steps

**Owner:** Dom  
**Priority:** Critical path to launch  
**Est. Time:** 2-3 days for full implementation
**Status:** Fix Pack v1 Applied ✅ (95% Complete)

## ✅ Completed with Fix Pack v1

- [x] Environment template created (`.env.example`)
- [x] Zod validation for env vars (`server/src/config/env.ts`)
- [x] Prisma decimal precision fixed
- [x] MemoryStore replaced with Prisma
- [x] Logger with redaction implemented
- [x] Global error middleware added
- [x] Package scripts updated
- [x] Smoke test added
- [x] GitHub Action for retention created

## 🔴 Day 1: Remaining Critical Setup (Dom's Manual Day)

### 2. Environment Setup (10 min)
```bash
# Create .env from template
cp .env.example .env

# Edit .env and fill in:
# - DATABASE_URL=file:./dev.db (for SQLite dev)
# - NOVAGIFT_CONTRACT_ID (from deployment)
# - FEE_SPONSOR (testnet account secret)
# - LINK_SIGNING_KEY (generate secure random)
# - JWT_SECRET (generate secure random)
```

### 3. Database Initialization (20 min)
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Verify database created
npx prisma studio  # Opens GUI at localhost:5555
```

### 4. Server Testing (30 min)
```bash
# Terminal 1: Start backend
cd server
npm run dev  # Should start on port 4000

# Terminal 2: Start frontend
npm run dev  # Should start on port 5173

# Test health endpoint
curl http://localhost:4000/health

# Test envelope creation (use Postman/Insomnia)
POST http://localhost:4000/api/envelope/create
{
  "asset": "USDC",
  "amount": "10.00",
  "message": "Test envelope",
  "expiresInMinutes": 60
}
```

### 5. Deploy Contract (if needed) (45 min)
```bash
# If NOVAGIFT_CONTRACT_ID is empty:
cd contracts/envelope
./scripts/deploy_envelope.sh

# Copy the contract ID to .env
```

## 🟡 Day 2: Core Fixes (Priority Order)

### 1. Complete Database Integration (2 hrs)
- [ ] Update all envelope routes to use envelopeRepo
- [ ] Implement proper transaction handling with withTx
- [ ] Add JTI idempotency checks in fund/open routes
- [ ] Test full envelope lifecycle (create → fund → open)

### 2. Error Handling Integration (1 hr)
- [ ] Import error middleware in server/src/index.ts
- [ ] Replace all res.status().json() with structured responses
- [ ] Test error scenarios (missing params, invalid data)

### 3. Logger Integration (1 hr)
- [ ] Replace console.log with logger throughout codebase
- [ ] Verify sensitive data redaction works
- [ ] Add request logging middleware

### 4. Testing Suite (2 hrs)
- [ ] Write tests for envelope routes
- [ ] Write tests for database repositories
- [ ] Achieve 70% code coverage minimum
- [ ] Run: `npm run test:server`

## 🟢 Day 3: Polish & Deploy

### 1. Frontend Integration (2 hrs)
- [ ] Test Freighter wallet connection
- [ ] Verify envelope creation flow
- [ ] Test demo mode fallback
- [ ] Fix any CORS issues

### 2. Reflector Integration (1 hr)
- [ ] Get Reflector API credentials
- [ ] Test quote endpoint
- [ ] Test swap execution
- [ ] Verify SwapReceipt persistence

### 3. Compliance Features (1 hr)
- [ ] Test consent middleware
- [ ] Run retention job manually
- [ ] Verify Profile creation/update

### 4. Staging Deployment (2 hrs)
- [ ] Set up Vercel project
- [ ] Configure environment variables
- [ ] Deploy to staging
- [ ] Run smoke tests

## 📋 Verification Checklist

Before considering "done":

- [ ] All patches applied successfully
- [ ] Database migrations run without errors
- [ ] Server starts without warnings
- [ ] Can create envelope via API
- [ ] Can fund envelope with transaction
- [ ] Can open envelope with preimage
- [ ] Frontend connects to backend
- [ ] Wallet integration works
- [ ] Error handling returns structured JSON
- [ ] Logs redact sensitive information
- [ ] Tests pass (npm run test)
- [ ] Lint passes (npm run lint)

## 🚧 Known Blockers

1. **Missing CONTRACT_ID** - Must deploy or get from previous deployment
2. **No Stellar testnet account** - Need funded account for FEE_SPONSOR
3. **Reflector API access** - May need to request credentials
4. **PostgreSQL for production** - Currently using SQLite

## 📞 Questions for Resolution

1. Should we use SQLite or PostgreSQL for initial deployment?
2. Do we have Reflector API credentials?
3. Is the contract already deployed? If so, what's the ID?
4. Should demo mode be enabled in production?
5. What's the target deployment date?

## 🎯 Success Metrics

- Zero errors on server startup
- All API endpoints return 200/201 for valid requests
- Database properly persists all operations
- Frontend successfully creates and opens envelopes
- Deployment accessible at staging URL

---

**Next Steps After Completion:**
1. Security audit
2. Performance testing
3. Documentation update
4. Mainnet preparation
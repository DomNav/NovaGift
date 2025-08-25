# NovaGift Vercel Deployment Guide

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Create a Vercel account and link your project:
```bash
vercel login
vercel link
```

## Database Setup

NovaGift uses PostgreSQL with Prisma on Vercel. You'll need to set up Vercel Postgres:

1. Go to your Vercel project dashboard
2. Navigate to Storage → Create Database → Postgres
3. Follow the setup wizard
4. Note the connection strings (DATABASE_URL and DIRECT_URL)

### Important Database Configuration

When using Vercel Postgres with Prisma, you need:
- `DATABASE_URL`: Connection string with `?pgbouncer=true&connection_limit=1` for pooling
- `DIRECT_URL`: Direct connection string for migrations (no pooling)

Example format:
```
DATABASE_URL="postgres://user:pass@host/db?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://user:pass@host/db"
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Pooled connection string for Vercel Postgres | `postgres://...?pgbouncer=true` |
| `DIRECT_URL` | Direct connection for migrations | `postgres://...` |
| `JWT_SECRET` | Secret for JWT token signing | `your-secret-key-min-32-chars` |
| `STELLAR_NETWORK` | Network to use | `TESTNET` or `PUBLIC` |
| `STELLAR_RPC_URL` | Stellar RPC endpoint | `https://soroban-testnet.stellar.org` |
| `CORS_ORIGIN` | Frontend URL for CORS | `https://your-app.vercel.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_FEE_SPONSORSHIP` | Enable fee sponsorship | `false` |
| `SPONSOR_SECRET_KEY` | Sponsor account secret | - |
| `ENABLE_REFLECTOR` | Enable Reflector integration | `false` |
| `REFLECTOR_API_KEY` | Reflector API key | - |

## Setup Instructions

### 1. Pull Environment Variables

Create `.env.local` from Vercel:
```bash
vercel env pull .env.local
```

### 2. Configure Environment Variables

Set production environment variables:
```bash
# Database (automatically set by Vercel Postgres)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Required configs
vercel env add JWT_SECRET production
vercel env add STELLAR_NETWORK production
vercel env add STELLAR_RPC_URL production
vercel env add CORS_ORIGIN production

# Optional configs
vercel env add ENABLE_FEE_SPONSORSHIP production
vercel env add SPONSOR_SECRET_KEY production
vercel env add ENABLE_REFLECTOR production
vercel env add REFLECTOR_API_KEY production
```

### 3. Database Migration

Run Prisma migrations:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations (uses DIRECT_URL)
npx prisma migrate deploy
```

### 4. Build Commands

The project uses these build commands (configured in vercel.json):

```bash
# Install dependencies and generate Prisma client
npm install && npx prisma generate

# Build both frontend and backend
npm run build:all
```

Individual build scripts:
- `npm run build:client` - Build Vite frontend
- `npm run build:server` - Build Express backend
- `npm run build:all` - Build both

### 5. Deploy

Deploy to Vercel:
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Project Structure

```
NovaGift/
├── api/
│   └── serverless.ts       # Vercel serverless handler
├── server/
│   └── src/               # Express backend source
├── src/                   # Vite frontend source
├── prisma/
│   └── schema.prisma      # Database schema
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies and scripts
```

## API Routes

All API routes are mapped through `/api/*` to the serverless function:

- `/api/health` - Health check endpoint
- `/api/envelope/*` - Envelope management
- `/api/stellar/*` - Stellar blockchain operations
- `/api/profile/*` - User profile management

## Troubleshooting

### Database Connection Issues

If you encounter "too many connections" errors:
1. Ensure `DATABASE_URL` includes `?pgbouncer=true&connection_limit=1`
2. Use `DIRECT_URL` only for migrations
3. Check Vercel Postgres dashboard for connection limits

### Build Failures

1. Clear cache: `vercel --force`
2. Check build logs: `vercel logs`
3. Ensure all environment variables are set
4. Verify Prisma schema is valid: `npx prisma validate`

### Runtime Errors

1. Check function logs: `vercel logs --function api/serverless`
2. Verify environment variables: `vercel env ls`
3. Test locally with Vercel CLI: `vercel dev`

## Local Development with Vercel

To simulate Vercel environment locally:
```bash
# Pull environment variables
vercel env pull .env.local

# Run with Vercel CLI
vercel dev
```

## Links and Resources

- [NovaGift Repository](https://github.com/DomNav/NovaGift)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres Guide](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Stellar Soroban Docs](https://soroban.stellar.org/docs)
- [Freighter Wallet](https://www.freighter.app/docs)
- [Reflector Network](https://reflector.network/docs)
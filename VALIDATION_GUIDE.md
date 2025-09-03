# NovaGift Validation Guide

This guide provides step-by-step instructions for validating all the new testing and monitoring features.

## 🎯 Quick Validation Checklist

### 1. k6 Load Test on CI
```bash
# Trigger manually (GitHub Actions)
gh workflow run load-test.yml

# Or run locally with low RPS
k6 run --vus 5 --duration 30s tests/load/gift-load.js
```

**Expected**: 
- CI workflow completes successfully
- Load test results posted as PR comment
- Artifacts uploaded (summary.json, summary.html)

### 2. Metrics Endpoint Validation
```bash
# Start the server
cd server && npm run dev

# In another terminal, run the test script
npx tsx server/scripts/test-metrics.ts

# Or manually check
curl http://localhost:4000/metrics | grep -E "(outbox_|gifts_|http_)"
```

**Expected**:
- Metrics endpoint returns Prometheus-formatted text
- Counters increment after API calls
- All required metrics present

### 3. Feature Flag Testing
```bash
# 1. Seed feature flags
npx tsx server/scripts/seed-feature-flags.ts

# 2. Start the server
npm run server:dev

# 3. Test flag evaluation
curl -X POST http://localhost:4000/api/feature-flags/evaluate \
  -H "Content-Type: application/json" \
  -d '{"flags": ["nft_attachments"], "context": {"userId": "test-user"}}'

# 4. Open Admin UI (requires auth)
# Navigate to: http://localhost:5174/admin/feature-flags
# Toggle "NFT Attachments" to 50% rollout
```

**Expected**:
- Flags evaluate correctly based on rollout percentage
- ~50% of requests with different user IDs get flag enabled
- Admin UI shows real-time statistics

### 4. Alert Path Testing
```bash
# Force an Outbox failure
# 1. Modify server/src/jobs/outbox.ts temporarily:
#    Add: throw new Error('Test failure'); in EMAIL_SEND handler

# 2. Create a gift that triggers email
curl -X POST http://localhost:4000/api/gift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "mode": "SINGLE",
    "metadata": {"theme": "RED", "message": "Test"},
    "totalAmount": 10,
    "recipients": [{"email": "test@example.com", "amount": 10}]
  }'

# 3. Monitor metrics for failures
curl http://localhost:4000/metrics | grep outbox_failed

# 4. Check Grafana alerts (if running)
docker-compose -f monitoring/docker-compose.yml up -d
# Navigate to: http://localhost:3001 (admin/admin)
```

**Expected**:
- outbox_failed_total counter increments
- Alert fires after 5 minutes (if Slack webhook configured)
- Grafana dashboard shows failure spike

## 🔧 Nice-to-Have Validations

### Rate Limiting
```bash
# Test rate limit on /gift endpoint
for i in {1..25}; do
  curl -X POST http://localhost:4000/api/gift \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d '{"mode": "SINGLE", "totalAmount": 1, "recipients": [{"email": "test@example.com"}]}' \
    -w "\nStatus: %{http_code}\n"
done
```

**Expected**:
- After 20 requests: HTTP 429 (Too Many Requests)
- Response includes Retry-After header
- X-RateLimit headers show remaining quota

### Outbox Archival
```bash
# Run archival job (archives records > 30 days old)
npx tsx server/src/jobs/archive-outbox.ts

# Or set to archive recent records for testing
OUTBOX_ARCHIVE_DAYS=0 npx tsx server/src/jobs/archive-outbox.ts
```

**Expected**:
- Creates compressed JSONL archive
- Deletes archived records from database
- Uploads to S3 (if configured)

### HMAC Webhook Security
```bash
# Test webhook with valid signature
npx tsx -e "
const { testWebhookEndpoint } = require('./server/src/middleware/hmac-verify');
testWebhookEndpoint(
  'http://localhost:4000/api/webhooks/escrow',
  { eventType: 'escrow_created', data: { escrowId: 'test' } },
  process.env.ESCROW_WEBHOOK_SECRET || 'development-webhook-secret'
).then(console.log);
"

# Test with invalid signature (should fail)
curl -X POST http://localhost:4000/api/webhooks/escrow \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: invalid-signature" \
  -d '{"eventType": "escrow_created"}'
```

**Expected**:
- Valid signature: HTTP 200
- Invalid signature: HTTP 401
- Timing-safe comparison prevents timing attacks

### PR Validation
```bash
# Run local validation
bash scripts/validate-pr.sh

# Or check GitHub Actions on PR
# The workflow will automatically:
# - Check if CHANGELOG.md is updated
# - Check if PROJECT_MEMORY.md is updated
# - Scan for console.log statements
# - Run security audit
```

**Expected**:
- Script exits 0 if documentation updated
- GitHub Action comments on PR with status
- Fails if required docs not updated

## 📊 Grafana Dashboard Validation

### Start Monitoring Stack
```bash
cd monitoring
docker-compose up -d

# Wait for services to start
sleep 30

# Access dashboards
open http://localhost:3001  # Grafana (admin/admin)
open http://localhost:9090  # Prometheus
open http://localhost:9093  # Alertmanager
```

### Verify Panels Update
1. Generate some traffic:
```bash
# Run mini load test
k6 run --vus 2 --duration 10s tests/load/gift-load.js
```

2. Check Grafana dashboard:
- Gift Creation Rate panel shows spikes
- API Response Time updates
- Outbox Queue Status reflects changes
- HTTP Request Rate increases

### Test Alert Rules
1. Force high error rate:
```bash
# Make many failing requests
for i in {1..20}; do
  curl -X POST http://localhost:4000/api/gift \
    -H "Content-Type: application/json" \
    -d 'invalid-json'
done
```

2. Check Alertmanager:
- Navigate to http://localhost:9093
- Should see "High Error Rate" alert after threshold

## 🔍 Troubleshooting

### Metrics not updating
- Check server logs for errors
- Ensure Prisma client is initialized
- Verify middleware is applied to routes

### Rate limiting not working
- Check Redis connection (if in production)
- Verify middleware order in route definitions
- Check for auth middleware that might skip limits

### Feature flags not evaluating
- Run seed script first
- Check database for flag records
- Verify cache isn't stale (5 min TTL)

### Webhooks failing verification
- Check ESCROW_WEBHOOK_SECRET env var
- Ensure raw body is captured (bodyParser config)
- Verify timestamp tolerance (5 minutes default)

## 📝 Summary

All validation steps should complete successfully. Key indicators:
- ✅ CI/CD pipeline runs load tests automatically
- ✅ Metrics increment correctly
- ✅ Feature flags roll out by percentage
- ✅ Rate limits prevent abuse
- ✅ Alerts fire for failures
- ✅ Documentation enforced via PR template

For production deployment:
1. Configure real Slack webhook URL
2. Set up S3 for archive storage
3. Deploy monitoring stack to production
4. Configure Grafana alerts with proper thresholds
5. Enable Redis for distributed rate limiting
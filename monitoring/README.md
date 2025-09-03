# NovaGift Monitoring Stack

Complete observability solution for NovaGift platform using Prometheus, Grafana, and Alertmanager.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- NovaGift API running on port 4000
- (Optional) Slack webhook URL for alerts

### Start Monitoring Stack

```bash
cd monitoring

# Set environment variables (optional)
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
export SMTP_USERNAME=your-email@gmail.com
export SMTP_PASSWORD=your-app-password

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## 📊 Metrics Collected

### Outbox Metrics
- `outbox_queued_total` - Messages waiting in queue
- `outbox_in_flight_total` - Messages being processed
- `outbox_processed_total` - Successfully processed messages
- `outbox_failed_total` - Failed messages
- `outbox_processing_duration_seconds` - Processing time histogram
- `outbox_retry_count` - Retry count distribution

### Gift Metrics
- `gifts_created_total` - Total gifts created (by mode/theme)
- `gifts_claimed_total` - Total gifts claimed
- `gifts_expired_total` - Total expired gifts
- `gift_value_usd` - Gift value distribution
- `gift_claim_duration_seconds` - Time to claim histogram

### API Metrics
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Request count by status
- `http_active_connections` - Active connection gauge

### System Metrics
- CPU usage, memory, disk I/O (via node-exporter)
- Process-level metrics from NovaGift app

## 🚨 Alerts Configured

### Critical Alerts
1. **Outbox Failed Messages** - Triggers when failures detected for 5+ minutes
2. **High Error Rate** - HTTP 5xx errors exceed 5%
3. **API Response Time** - P95 latency exceeds 1 second

### Warning Alerts
1. **Gift Claim Rate Drop** - 50% drop compared to 24h average
2. **Outbox Queue Backlog** - Over 1000 messages queued
3. **High Gift Expiry Rate** - Over 20% gifts expiring

### Business Alerts
1. **Low Gift Creation** - Less than 10 gifts/hour
2. **High Expiry Rate** - Over 20% gifts expiring unclaimed

## 📝 Configuration

### Customize Scrape Intervals

Edit `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s  # Default scrape interval
  
scrape_configs:
  - job_name: 'novagift'
    scrape_interval: 30s  # Override for NovaGift
```

### Add Custom Alerts

1. Create alert file in `monitoring/alerts/`:
```yaml
groups:
  - name: custom_alerts
    rules:
      - alert: CustomAlert
        expr: your_metric > threshold
        for: 5m
        annotations:
          summary: "Custom alert triggered"
```

2. Reference in `prometheus.yml`:
```yaml
rule_files:
  - "alerts/*.yml"
```

### Slack Integration

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Set environment variable:
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
3. Restart alertmanager:
```bash
docker-compose restart alertmanager
```

## 📈 Load Testing Integration

Run k6 load tests and view results in Grafana:

```bash
# Run load test with Prometheus export
k6 run --out output-prometheus-remote tests/load/gift-load.js

# Or push to InfluxDB (if configured)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/gift-load.js
```

## 🔧 Troubleshooting

### No metrics appearing
```bash
# Check if API is exposing metrics
curl http://localhost:4000/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check container logs
docker-compose logs prometheus
```

### Grafana dashboard not loading
```bash
# Reimport dashboard
docker-compose exec grafana \
  curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @/var/lib/grafana/dashboards/dashboard.json
```

### Alerts not firing
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check alertmanager status
curl http://localhost:9093/api/v1/status

# Test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"test","severity":"critical"}}]'
```

## 📚 Dashboard Panels

### Main Dashboard Includes:
1. **Gift Creation Rate** - Real-time gift creation by mode
2. **API Response Time** - P95/P99 latency graphs
3. **Outbox Status** - Queue depth and processing rate
4. **Failed Messages** - Alert on processing failures
5. **Retry Distribution** - Histogram of retry counts
6. **Gift Claim Rate** - Claims vs expiries
7. **Claim Duration Heatmap** - Time-to-claim distribution
8. **Gift Value Distribution** - USD value statistics
9. **HTTP Request Rate** - By status code
10. **System Health** - CPU, memory, uptime
11. **Wallet Transactions** - Transaction volume
12. **Top Errors** - Error summary table

## 🔄 Backup & Restore

### Backup Grafana Dashboards
```bash
# Export all dashboards
docker-compose exec grafana \
  curl -s http://admin:admin@localhost:3000/api/search | \
  jq -r '.[] | .uid' | \
  xargs -I {} curl -s http://admin:admin@localhost:3000/api/dashboards/uid/{} \
  > dashboards_backup.json
```

### Backup Prometheus Data
```bash
# Create snapshot
docker-compose exec prometheus \
  curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Copy snapshot
docker cp novagift-prometheus:/prometheus/snapshots ./prometheus_backup
```

## 📦 Production Deployment

For production, consider:
1. **Persistent volumes** for data retention
2. **External storage** (S3, GCS) for Prometheus
3. **High availability** with multiple replicas
4. **Authentication** for Grafana access
5. **TLS/SSL** for all endpoints
6. **Retention policies** for metrics data

### Example Production Config
```yaml
# docker-compose.prod.yml
services:
  prometheus:
    volumes:
      - /data/prometheus:/prometheus
    command:
      - '--storage.tsdb.retention.time=90d'
      - '--storage.tsdb.retention.size=50GB'
    
  grafana:
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_AUTH_BASIC_ENABLED=true
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
```

## 🆘 Support

- Documentation: https://docs.novagift.com/monitoring
- Runbooks: https://docs.novagift.com/runbooks
- Slack: #novagift-monitoring
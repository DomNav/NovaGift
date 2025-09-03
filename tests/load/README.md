# K6 Load Tests

## Installation

```bash
# macOS
brew install k6

# Windows (using Chocolatey)
choco install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Using Docker
docker pull grafana/k6
```

## Running the Tests

### Basic Run
```bash
# From project root
k6 run tests/load/gift-load.js

# With custom API URL
k6 run -e API_URL=https://staging.novagift.com tests/load/gift-load.js

# With auth token
k6 run -e AUTH_TOKEN=your_jwt_token tests/load/gift-load.js
```

### Docker Run
```bash
docker run --rm -v $(pwd):/src -i grafana/k6 run /src/tests/load/gift-load.js
```

### Output Options
```bash
# Save summary to file
k6 run --summary-export=summary.json tests/load/gift-load.js

# Export to InfluxDB for Grafana
k6 run --out influxdb=http://localhost:8086/k6 tests/load/gift-load.js

# Export to Prometheus Remote Write
k6 run -o experimental-prometheus-rw tests/load/gift-load.js
```

## Test Configuration

The load test simulates 1000 requests per minute with the following pattern:
- **Warm-up**: 30 seconds ramping up to target load
- **Sustained Load**: 5 minutes at 1000 req/min (17 req/s)
- **Cool-down**: 30 seconds ramping down

### Thresholds
- ✅ P95 Response Time < 500ms
- ✅ P99 Response Time < 1000ms
- ✅ Error Rate < 1%
- ✅ Success Rate > 99%

### Gift Modes Tested
- **SINGLE**: Individual gift envelopes
- **MULTI**: Multiple specific recipients
- **POOL**: First-come-first-served pool

## Interpreting Results

After running, you'll get:
1. **Console output** with summary statistics
2. **summary.json** with detailed metrics
3. **summary.html** with visual report

Key metrics to watch:
- `http_req_duration`: Response time percentiles
- `errors`: Custom error rate metric
- `success`: Custom success rate metric
- `http_reqs`: Total requests and rate

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Load Test
  run: |
    k6 run \
      -e API_URL=${{ secrets.STAGING_URL }} \
      -e AUTH_TOKEN=${{ secrets.TEST_JWT }} \
      --summary-export=summary.json \
      tests/load/gift-load.js
    
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: load-test-results
    path: summary.json
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure API server is running on correct port
2. **Auth errors**: Check AUTH_TOKEN environment variable
3. **High error rate**: Review server logs for capacity issues
4. **Timeout errors**: Increase timeout in test or check network

### Debug Mode
```bash
# Verbose output
k6 run --verbose tests/load/gift-load.js

# Single iteration for testing
k6 run --iterations 1 --vus 1 tests/load/gift-load.js
```
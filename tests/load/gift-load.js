import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up to 1000 requests per minute
    gift_load_test: {
      executor: 'ramping-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 17 },  // Warm up to ~1000 req/min
        { duration: '5m', target: 17 },   // Stay at 1000 req/min (17 req/s)
        { duration: '30s', target: 0 },   // Ramp down
      ],
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    errors: ['rate<0.01'],  // Error rate under 1%
    success: ['rate>0.99'], // Success rate above 99%
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Test data generators
function generateGiftRequest(mode = 'SINGLE') {
  const requestBodies = {
    SINGLE: {
      mode: 'SINGLE',
      metadata: {
        theme: 'RED',
        message: 'Happy Birthday! 🎉',
        recipientName: `User${Math.floor(Math.random() * 10000)}`,
        recipientEmail: `user${Math.floor(Math.random() * 10000)}@example.com`,
      },
      totalAmount: 10,
      recipients: [{
        email: `recipient${Math.floor(Math.random() * 10000)}@example.com`,
        amount: 10,
      }],
    },
    MULTI: {
      mode: 'MULTI',
      metadata: {
        theme: 'GOLD',
        message: 'Happy Holidays!',
      },
      totalAmount: 50,
      recipients: [
        { email: `recipient1_${Date.now()}@example.com`, amount: 25 },
        { email: `recipient2_${Date.now()}@example.com`, amount: 25 },
      ],
    },
    POOL: {
      mode: 'POOL',
      metadata: {
        theme: 'GREEN',
        message: 'Team Bonus Pool!',
      },
      totalAmount: 100,
      maxRecipients: 10,
      amountPerRecipient: 10,
    },
  };

  return requestBodies[mode];
}

// Main test function
export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:4000';
  const authToken = __ENV.AUTH_TOKEN || 'test_jwt_token';
  
  // Randomly select gift mode
  const modes = ['SINGLE', 'MULTI', 'POOL'];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  
  // Prepare request
  const payload = JSON.stringify(generateGiftRequest(mode));
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '10s',
    tags: {
      name: `gift_${mode}`,
    },
  };

  // Make request
  const response = http.post(`${baseUrl}/api/gift`, payload, params);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has envelope_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.envelope_id !== undefined;
      } catch (e) {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // Record custom metrics
  errorRate.add(!success);
  successRate.add(success);

  // Log errors for debugging
  if (!success) {
    console.error(`Request failed: ${response.status} - ${response.body}`);
  }

  // Small random sleep to simulate realistic user behavior
  sleep(Math.random() * 2);
}

// Custom summary export
export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  
  // Console output
  console.log(textSummary(data, { indent: '  ', enableColors: true }));
  
  // Metrics export for Prometheus/Grafana
  const metrics = {
    timestamp,
    test: 'gift_load',
    requests: {
      total: data.metrics.http_reqs?.values?.count || 0,
      rate: data.metrics.http_reqs?.values?.rate || 0,
    },
    duration: {
      avg: data.metrics.http_req_duration?.values?.avg || 0,
      p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99: data.metrics.http_req_duration?.values['p(99)'] || 0,
    },
    errors: {
      rate: data.metrics.errors?.values?.rate || 0,
      count: data.metrics.errors?.values?.count || 0,
    },
    success: {
      rate: data.metrics.success?.values?.rate || 0,
      count: data.metrics.success?.values?.count || 0,
    },
    vus: {
      max: data.metrics.vus_max?.values?.max || 0,
    },
  };

  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
    'summary.json': JSON.stringify(metrics, null, 2),
    'summary.html': htmlReport(data, metrics),
  };
}

// HTML report generator
function htmlReport(data, metrics) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Gift API Load Test Results - ${metrics.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 20px; border-radius: 8px; }
        .metric-card { background: white; padding: 20px; margin: 20px 0; 
                       border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 14px; color: #666; margin-bottom: 8px; }
        .metric-value { font-size: 32px; font-weight: bold; color: #333; }
        .metric-unit { font-size: 14px; color: #999; }
        .status-pass { color: #4caf50; }
        .status-fail { color: #f44336; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎁 NovaGift Load Test Results</h1>
        <p>Target: 1000 requests/minute | Duration: 6 minutes | Mode: SINGLE, MULTI, POOL</p>
        <p>Timestamp: ${metrics.timestamp}</p>
    </div>

    <div class="grid">
        <div class="metric-card">
            <div class="metric-title">Total Requests</div>
            <div class="metric-value">${metrics.requests.total}</div>
            <div class="metric-unit">${metrics.requests.rate.toFixed(2)} req/s</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Success Rate</div>
            <div class="metric-value ${metrics.success.rate >= 0.99 ? 'status-pass' : 'status-fail'}">
                ${(metrics.success.rate * 100).toFixed(2)}%
            </div>
            <div class="metric-unit">${metrics.success.count} successful</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Error Rate</div>
            <div class="metric-value ${metrics.errors.rate <= 0.01 ? 'status-pass' : 'status-fail'}">
                ${(metrics.errors.rate * 100).toFixed(2)}%
            </div>
            <div class="metric-unit">${metrics.errors.count} errors</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Avg Response Time</div>
            <div class="metric-value">${metrics.duration.avg.toFixed(0)}</div>
            <div class="metric-unit">milliseconds</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">P95 Response Time</div>
            <div class="metric-value ${metrics.duration.p95 <= 500 ? 'status-pass' : 'status-fail'}">
                ${metrics.duration.p95.toFixed(0)}
            </div>
            <div class="metric-unit">milliseconds</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">P99 Response Time</div>
            <div class="metric-value ${metrics.duration.p99 <= 1000 ? 'status-pass' : 'status-fail'}">
                ${metrics.duration.p99.toFixed(0)}
            </div>
            <div class="metric-unit">milliseconds</div>
        </div>
    </div>

    <div class="metric-card">
        <h3>Thresholds</h3>
        <ul>
            <li>✅ P95 Response Time < 500ms: ${metrics.duration.p95 <= 500 ? 'PASS' : 'FAIL'}</li>
            <li>✅ P99 Response Time < 1000ms: ${metrics.duration.p99 <= 1000 ? 'PASS' : 'FAIL'}</li>
            <li>✅ Error Rate < 1%: ${metrics.errors.rate <= 0.01 ? 'PASS' : 'FAIL'}</li>
            <li>✅ Success Rate > 99%: ${metrics.success.rate >= 0.99 ? 'PASS' : 'FAIL'}</li>
        </ul>
    </div>
</body>
</html>
  `;
}
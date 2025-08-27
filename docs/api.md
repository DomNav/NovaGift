# NovaGift API Documentation

## Base URL
- Development: `http://localhost:4000/api`
- Testnet: `https://api.novagift.testnet.com/api`

## Authentication
Most endpoints are public. JWT tokens are used for one-time open links.

## Endpoints

### 1. Create Envelope
Create a new gift envelope with locked funds.

**Endpoint:** `POST /envelope/create`

**Request Body:**
```json
{
  "sender": "G...", // Stellar public key
  "asset": "USDC", // or "XLM"
  "amount": "10.50", // Decimal string
  "message": "Happy Birthday!", // Optional, max 280 chars
  "expiresInMinutes": 1440 // 15 min to 10080 (7 days)
}
```

**Response:**
```json
{
  "id": "abc123...", // 64-char hex envelope ID
  "unsignedXDR": "AAAAAgAAAA...", // Unsigned transaction XDR
  "openUrl": "https://app.novagift.com/open/abc123?t=...",
  "preimage": "def456...", // 64-char hex preimage (keep secret!)
  "expiresAt": "2024-01-02T12:00:00Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/envelope/create \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON",
    "asset": "USDC",
    "amount": "25.00",
    "message": "Congratulations!",
    "expiresInMinutes": 1440
  }'
```

### 2. Fund Envelope
Confirm that the create transaction was submitted on-chain.

**Endpoint:** `POST /envelope/fund`

**Request Body:**
```json
{
  "id": "abc123...", // Envelope ID
  "txId": "txhash123..." // Stellar transaction hash
}
```

**Response:**
```json
{
  "id": "abc123...",
  "status": "FUNDED"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/envelope/fund \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123def456...",
    "txId": "3389e9f0bcab3f..."
  }'
```

### 3. Open Envelope
Claim the funds from an envelope using the preimage.

**Endpoint:** `POST /envelope/open?t={jwt_token}`

**Request Body:**
```json
{
  "id": "abc123...", // Envelope ID
  "recipient": "G...", // Recipient's Stellar public key
  "preimage": "def456...", // 64-char hex preimage
  "wantAsset": "XLM" // Optional, for cross-asset delivery
}
```

**Response:**
```json
{
  "id": "abc123...",
  "status": "OPENED",
  "recipient": "G...",
  "assetDelivered": "XLM",
  "amount": "25.00",
  "txId": "tx789...",
  "openedAt": "2024-01-02T12:30:00Z",
  "memo": "NOVAGIFT:abc123de"
}
```

**cURL Example:**
```bash
# First, get the JWT token from the open URL
# Then use it in the query parameter
curl -X POST "http://localhost:4000/api/envelope/open?t=eyJhbGciOiJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123def456...",
    "recipient": "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA",
    "preimage": "789abc...",
    "wantAsset": "USDC"
  }'
```

### 4. Cancel Envelope
Cancel an expired envelope and refund the sender.

**Endpoint:** `POST /envelope/cancel`

**Request Body:**
```json
{
  "id": "abc123...", // Envelope ID
  "sender": "G..." // Original sender's public key
}
```

**Response:**
```json
{
  "id": "abc123...",
  "status": "CANCELED",
  "unsignedXDR": "AAAAAgAAAA..." // Cancel transaction XDR
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/envelope/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc123def456...",
    "sender": "GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON"
  }'
```

### 5. Health Check
Check if the API is running and get environment info.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "ok": true,
  "env": "testnet",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**cURL Example:**
```bash
curl http://localhost:4000/api/health
```

## Rate Limits

- **Create Envelope:** 20 requests per minute per IP
- **Open Envelope:** 60 requests per minute per IP
- **General API:** 100 requests per minute per IP

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": [] // Optional, validation errors
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (not allowed)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Workflow Example

1. **Sender creates envelope:**
   - Call `/envelope/create` with asset and amount
   - Receive unsigned XDR and open URL
   - Sign and submit XDR to Stellar network
   - Share open URL with recipient (keep preimage secret!)

2. **Sender confirms funding:**
   - Call `/envelope/fund` with transaction ID
   - Envelope status changes to FUNDED

3. **Recipient opens envelope:**
   - Visit open URL (contains JWT token)
   - Call `/envelope/open` with preimage and recipient address
   - Funds are transferred (fee sponsored by server)
   - Receive receipt with delivery details

4. **If envelope expires:**
   - Sender can call `/envelope/cancel`
   - Sign and submit cancel XDR
   - Funds are refunded

## Notes

- All amounts are decimal strings (e.g., "10.50")
- All IDs and hashes are 64-character hexadecimal strings
- Timestamps are ISO 8601 format
- JWT tokens expire after 30 minutes
- Envelopes can expire between 15 minutes and 7 days
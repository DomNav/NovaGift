# KALE Token Gating Documentation

## Overview
KALE gating provides a hold-to-unlock mechanism for premium envelope skins using on-chain token balances via Soroban read-only calls.

## Architecture

### Flow Diagram
```
Browser (Freighter) → /auth/sep10/* → JWT → /api/kale/* → Soroban read path
```

### Components

1. **Authentication (SEP-10)**
   - Server issues challenge XDR with server signature
   - Client signs challenge with Freighter wallet
   - Server verifies both signatures and issues JWT
   - JWT contains wallet public key as subject (sub)

2. **KALE Balance Reading**
   - Read-only Soroban contract calls to KALE token
   - Falls back to deterministic fake balances if no contract configured
   - Holdings checked on each eligibility request

3. **Skin Eligibility**
   - Server-authoritative gating based on holdings
   - No custody - tokens remain in user wallet
   - One-time unlock stored in database

## Configuration

### Environment Variables
```env
# KALE Token
KALE_CONTRACT_ID=C...          # KALE token contract ID
KALE_FAKE_BALANCE=true         # Use fake balances for testing

# SEP-10 Authentication
WEB_AUTH_HOME_DOMAIN=novagift.local
WEB_AUTH_DOMAIN=auth.novagift.local  
WEB_AUTH_SERVER_SECRET=S...     # Server signing key

# JWT Sessions
JWT_SECRET=change_me_now
JWT_EXPIRES_IN=900s             # 15 minutes
```

### Skin Rules
Located in `server/src/config/skins.ts`:

| Skin ID | Threshold | Label |
|---------|-----------|-------|
| wrapper.midnight-holo | 1 KALE | Common (≥1 KALE) |
| wrapper.aurora-glass | 5 KALE | Rare (≥5 KALE) |
| wrapper.solar-flare | 25 KALE | Epic (≥25 KALE) |
| wrapper.cosmic-gold | 100 KALE | Legendary (≥100 KALE) |

## API Endpoints

### POST /auth/sep10/challenge
Get authentication challenge for wallet.

**Request:**
```json
{
  "account": "G..."  // Stellar public key
}
```

**Response:**
```json
{
  "xdr": "...",                    // Challenge transaction XDR
  "serverAccountId": "G...",       // Server public key
  "homeDomain": "novagift.local",
  "webAuthDomain": "auth.novagift.local",
  "networkPassphrase": "Test SDF Network ; September 2015"
}
```

### POST /auth/sep10/verify
Verify signed challenge and get JWT.

**Request:**
```json
{
  "signedXDR": "..."  // Signed transaction XDR
}
```

**Response:**
```json
{
  "token": "eyJ...",  // JWT token
  "sub": "G...",      // Wallet public key
  "server": "G..."    // Server public key
}
```

### GET /api/kale/eligibility
Check KALE holdings and skin eligibility.

**Headers:**
```
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "holdings": 42,
  "eligible": {
    "wrapper.midnight-holo": true,
    "wrapper.aurora-glass": true,
    "wrapper.solar-flare": true,
    "wrapper.cosmic-gold": false
  },
  "rules": {
    "wrapper.midnight-holo": { 
      "threshold": 1, 
      "label": "Common (≥1 KALE)" 
    },
    // ...
  }
}
```

### POST /api/kale/redeem-kale-gated
Unlock a skin if eligible.

**Headers:**
```
Authorization: Bearer <JWT>
```

**Request:**
```json
{
  "skinId": "wrapper.aurora-glass"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "skinId": "wrapper.aurora-glass"
}
```

**Response (Insufficient Holdings):**
```json
{
  "error": "not_eligible",
  "needed": 5,
  "have": 3
}
```

## Security Considerations

1. **Server-Authoritative Gating**
   - All eligibility checks happen server-side
   - Client cannot bypass by modifying frontend

2. **No Token Custody**
   - KALE tokens never leave user wallet
   - Only read-only balance checks via Soroban

3. **JWT Expiry**
   - Sessions expire after 15 minutes by default
   - Requires re-authentication periodically

4. **Database Tracking**
   - Unlocked skins stored in database
   - Prevents double-unlocking exploits

## Testing

### With Fake Balances
Set `KALE_FAKE_BALANCE=true` to use deterministic test balances based on wallet address hash.

### With Real Contract
1. Deploy KALE token contract to testnet
2. Set `KALE_CONTRACT_ID` in environment
3. Set `KALE_FAKE_BALANCE=false`
4. Ensure accounts have KALE tokens

## Future Enhancements

- **Hold Duration Requirements**: Require tokens held for N days
- **Staking Integration**: Check staked KALE balances
- **Dynamic Thresholds**: Update thresholds based on market conditions
- **Multi-Token Gating**: Support multiple token types
- **NFT Integration**: Gate skins based on NFT ownership
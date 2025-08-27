# NovaGift Progress

## ✅ Completed Features

### Frontend
- ✅ Freighter connect present (useFreighter/WalletGate)
- ✅ Balances route + UI chip (XLM & assets)
- ✅ Price chip with 15s refresh (Reflector-ready; fallback active)
- ✅ Health endpoint & chip (DB/Horizon/RPC)
- ✅ Smoke tests (wallet, rates)

### Backend
- ✅ JWT-signed one-time links with 30-minute expiry
- ✅ Fee sponsorship - recipients pay zero fees  
- ✅ HTLC-based secure envelopes with preimage/hash claiming
- ✅ In-memory store for MVP (SQLite ready)
- ✅ Rate limiting for API protection
- ✅ SEP-10 Authentication via Freighter
- ✅ KALE Token Gating for premium skins

### API Endpoints
- ✅ `/api/wallet/balances/:account` - Get wallet balances from Horizon
- ✅ `/api/rates/spot` - Get price rates with CoinGecko fallback  
- ✅ `/api/health` - Health check with service status
- ✅ `/api/envelope/create` - Create new envelope with HTLC
- ✅ `/api/envelope/fund` - Confirm on-chain funding
- ✅ `/api/envelope/open` - Claim with preimage (fee-sponsored)

## 🚧 In Progress

- [ ] Reflector contract/API integration (stub in place)
- [ ] Cross-asset delivery via Reflector

## 📝 To Do

- [ ] Email notifications via Resend
- [ ] User karma and rewards system
- [ ] Studio mode customization
- [ ] Contract deployment automation
- [ ] Production deployment configuration
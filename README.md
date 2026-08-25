# Multi-Asset Trading Platform - Stocks | Crypto | Forex | Commodity | Index

## System Design

### HLD
```
[React Frontend :3000] --REST/WebSocket--> [Express API :5000] --> [MongoDB + Redis]
         |                                      |
         |--> TradingView Charts                |--> Market Data Service (AlphaVantage/Binance/OANDA/Yahoo)
         |--> Socket.io (price:update)          |--> Order Management Service (OMS)
                                              |--> Risk Engine (margin, leverage)
                                              |--> Execution Adapter (Broker APIs: Alpaca, Binance, Zerodha)
```

**Architecture Style:** Micro-services ready, currently modular monolith for speed. Horizontal scale via PM2 / K8s.

**Real-time:** Socket.io broadcasts `price:update` every 2s (mock). Prod: subscribe to Binance WS, AlphaVantage WS, OANDA streaming.

**Asset Classes & Providers:**
- Stocks: AlphaVantage / Yahoo Finance / Alpaca
- Crypto: Binance / Coinbase WS
- Forex: OANDA / Forex API
- Commodity: Yahoo Finance (GOLD, SILVER, CRUDE)
- Index: NIFTY/SENSEX/SPX via Yahoo

### LLD
- **DB Schema:** Users(id,email,hash) | Orders(id,symbol,assetClass,side,qty,price,status) | Holdings(symbol,qty,avgPrice) | Candles(symbol, OHLCV)
- **APIs:** `GET /api/market/prices?class=crypto` | `GET /api/market/candle/:symbol` | `POST /api/orders` | `GET /api/portfolio`
- **Auth:** JWT + bcrypt
- **Validation:** Joi
- **Risk:** Pre-trade margin check (extend in `services/risk.js`)

### Run Locally
```bash
# backend
cd backend && npm install && npm run dev
# frontend
cd frontend && npm install && npm run dev
```
Backend: http://localhost:5000  Frontend: http://localhost:3000

### Environment
Copy `backend/.env.example` to `backend/.env` and fill keys.

### Next Steps (Production)
1. Replace mock `marketData.js` with real provider adapters + Redis cache + node-cron for polling
2. Add DB persistence (Mongoose models in `src/models/`)
3. Add OMS queue (BullMQ + Redis) and broker execution
4. Add KYC, 2FA, compliance logging
5. Deploy via Docker + Azure Container Apps / AKS

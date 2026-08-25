# TradingPlatform - LLM Handoff

**Goal:** Continue development with any LLM. Paste this + `git clone https://github.com/yogishwaraudupa/TradingPlatform.git`

## Links
- **GitHub:** https://github.com/yogishwaraudupa/TradingPlatform (branch `main`, latest `55fa1c7` charts)
- **Frontend PRO:** https://trading-app.vercel.app + https://trading-eta-dusky-90.vercel.app (Vercel project `frontend`, Vite + React + Recharts)
- **Backend API:** https://backend-five-gamma-49.vercel.app (Vercel project `backend`, Express) | Health: `/api/health` -> `{status:ok assets:[stocks,crypto,forex,commodity,index]}`
- **Alt Frontend (GitHub auto):** https://trading-platform-umber-alpha.vercel.app
- **Local:** `C:\Users\yogee\OneDrive\Documents\TradingPlatform` -> `frontend/` `:3000` + `backend/` `:5000`

## Stack
- **Frontend:** Vite, React 18, react-router, axios, socket.io-client, recharts, custom CSS (`src/index.css`, `src/App.jsx`)
- **Backend:** Express, cors, socket.io, mongoose (optional), JWT, bcryptjs, axios, cron (`src/app.js` + `src/server.js` for WS, `src/routes/{auth,market,orders,portfolio}`, `src/services/marketData.js`, `src/ws/handler.js`)
- **Market Data:** Mock `marketData.js:4` ASSETS 20 symbols, `price:update` WS 2s + polling fallback for Vercel. Providers TODO: Binance, AlphaVantage, OANDA, Yahoo.

## Features Built (chronological)
1. Newton's Forward `newtons_forward.py/.cpp` demo
2. Multi-asset scaffold `backend/src/services/marketData.js`, `routes/market.js` (+ `/candle/:symbol` mock OHLCV), `orders`, `portfolio`, `auth`
3. Pro UI `frontend/src/App.jsx` - header/tabs (5 assets), ticker, 3-col layout (320px watchlist + chart + 340px order ticket/portfolio/orders), dark theme `#0b0e11`/`#f0b90b`
4. Auth: `backend/src/routes/auth.js:21` case-insensitive `email.toLowerCase()`, auto-create user demo mode (any ID/pass works). Frontend `Login` gate in `App.jsx:15` stores token/user localStorage.
5. Charts: `frontend/src/App.jsx` enriched helpers `sma, ema, rsi, bollinger, macd, enrich` + chartType `candle|line|area` + toggles SMA20/SMA50/EMA20/BB/Volume/RSI/MACD. Candle via custom `CandleBar` + ComposedChart.
6. Vercel: `backend/vercel.json` `@vercel/node` -> `api/index.js` wrapper (`src/app.js` for serverless, `src/server.js` for local WS). `frontend/vercel.json` SPA rewrite. Domains aliased to `trading-app` etc.

## File Map
- `frontend/src/App.jsx` - Login + Trading Terminal (watchlist, chart with indicators, order ticket)
- `frontend/src/index.css` - dark pro styles
- `frontend/.env.production` - `VITE_API_URL=https://backend-five-gamma-49.vercel.app`
- `backend/src/app.js` - Express app (serverless)
- `backend/src/server.js` - http+Socket.io for local
- `backend/src/routes/auth.js` - login/register case-insensitive any-credentials
- `backend/src/routes/market.js` - classes/prices/symbols/candle
- `backend/src/services/marketData.js` - mock feed `startPriceFeed`
- `backend/api/index.js` - Vercel entry

## Recent Commands
- Build: `cd frontend && npm run build` + `vercel deploy --prod --yes --cwd frontend` -> alias `trading-app`
- Backend: `vercel deploy --prod --yes --cwd backend` -> `backend-five-gamma-49`
- Git: `git push` auto-triggers `trading-platform` Vercel.

## How to Continue (prompt for other LLM)
> You are working on https://github.com/yogishwaraudupa/TradingPlatform, a multi-asset trading app (stocks/crypto/forex/commodity/index) deployed to https://trading-app.vercel.app (frontend) + https://backend-five-gamma-49.vercel.app (backend). Stack: MERN-ish (Express+Socket.io+Vite React+Recharts). Features: mock live prices, 5 asset classes, Pro dark UI, case-insensitive demo login (any credentials), candles/line/area charts with SMA/EMA/BB/Volume/RSI/MACD indicators, order ticket + portfolio. Read `HANDOFF.md`, `frontend/src/App.jsx`, `backend/src/services/marketData.js`, `README.md`, then implement [YOUR NEXT FEATURE]. Keep Vercel deployable (`vercel.json`), case-insensitive auth, and `VITE_API_URL` wiring.

## Next Ideas (pick one)
- Real providers (Binance WS, AlphaVantage) + Redis
- Leverage/margin, SL/TP, TradingView widget
- Persist orders/holdings to MongoDB + JWT guard
- Lightweight-charts migration, timeframe selector 1m/5m/1d
- Tests + CI

## Conversation History (condensed)
- User: hi, what is system design, create cpp, build trading app 5 assets, make it open, push to github, host in vercel, fix build ENOENT + 404, give link, ui not satisfied, make trading alias remove frontend, login any case, add all graphs candles/indicators, give link conversation.
- Assistant: Built TradingPlatform, fixed vercel.json, aliased trading-app, added login, added charts.

---
Paste this file + repo URL into Claude/GPT/Gemini to continue.

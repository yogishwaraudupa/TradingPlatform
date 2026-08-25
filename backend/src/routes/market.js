const express = require('express');
const router = express.Router();
const { ASSETS, YAHOO_MAP, getAllPrices, getPricesByClass, fetchYahooQuotes } = require('../services/marketData');
const axios = require('axios');

// GET /api/market/classes -> list asset classes
router.get('/classes', (req, res) => {
  res.json(Object.keys(ASSETS));
});

// GET /api/market/prices?class=crypto -> real-time prices (tries Yahoo live first)
router.get('/prices', async (req, res) => {
  const { class: assetClass, refresh } = req.query;
  if(refresh === '1'){
    await fetchYahooQuotes().catch(()=>{})
  }
  if (assetClass) {
    const data = getPricesByClass(assetClass);
    if (data.length === 0) return res.status(404).json({ error: 'Invalid asset class' });
    return res.json(data);
  }
  res.json(getAllPrices());
});

// GET /api/market/symbols
router.get('/symbols', (req, res) => {
  res.json({ assets: ASSETS, yahooMap: YAHOO_MAP });
});

// GET /api/market/quote/:symbol -> live single quote from Yahoo
router.get('/quote/:symbol', async (req,res)=>{
  const { symbol } = req.params;
  const yahooSym = YAHOO_MAP[symbol] || symbol;
  try{
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSym}`, {
      headers:{'User-Agent':'Mozilla/5.0'}, timeout:5000
    })
    const q = data?.quoteResponse?.result?.[0]
    if(!q) return res.status(404).json({error:'Not found', symbol, yahooSym})
    res.json({
      symbol,
      yahooSymbol: yahooSym,
      price: q.regularMarketPrice,
      prevClose: q.regularMarketPreviousClose,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      currency: q.currency,
      marketState: q.marketState,
      source: 'yahoo'
    })
  }catch(e){
    res.status(500).json({error:e.message, symbol, yahooSym})
  }
})

// GET /api/market/candle/:symbol?interval=1m -> try Yahoo chart, fallback mock
router.get('/candle/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const yahooSym = YAHOO_MAP[symbol] || symbol;
  const interval = req.query.interval || '1m';
  try{
    // Try Yahoo chart API for real candles
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=${interval}&range=1d`, {
      headers:{'User-Agent':'Mozilla/5.0'}, timeout:6000
    })
    const result = data?.chart?.result?.[0]
    if(result && result.timestamp && result.indicators?.quote?.[0]){
      const ts = result.timestamp
      const q = result.indicators.quote[0]
      const candles = ts.map((t,i)=>({
        time: t*1000,
        open: q.open[i] ?? q.close[i],
        high: q.high[i] ?? q.close[i],
        low: q.low[i] ?? q.close[i],
        close: q.close[i],
        volume: q.volume[i] ?? 0,
      })).filter(c=> c.close!=null).slice(-50)
      if(candles.length>=10){
        return res.json({ symbol, yahooSymbol: yahooSym, source:'yahoo', interval, candles })
      }
    }
  }catch(e){
    console.log('Yahoo candle failed for', yahooSym, e.message)
  }
  // Fallback mock OHLCV
  const candles = Array.from({ length: 50 }, (_, i) => {
    const base = 100 + Math.sin(i/5)*10 + Math.random()*5;
    return {
      time: Date.now() - (50-i)*60000,
      open: Number((base).toFixed(2)),
      high: Number((base+2).toFixed(2)),
      low: Number((base-2).toFixed(2)),
      close: Number((base+Math.random()*2-1).toFixed(2)),
      volume: Math.floor(Math.random()*10000)
    };
  });
  res.json({ symbol, yahooSymbol: yahooSym, source:'mock', interval, candles });
});

module.exports = router;

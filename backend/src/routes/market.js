const express = require('express');
const router = express.Router();
const { ASSETS, getAllPrices, getPricesByClass } = require('../services/marketData');

// GET /api/market/classes -> list asset classes
router.get('/classes', (req, res) => {
  res.json(Object.keys(ASSETS));
});

// GET /api/market/prices?class=crypto
router.get('/prices', (req, res) => {
  const { class: assetClass } = req.query;
  if (assetClass) {
    const data = getPricesByClass(assetClass);
    if (data.length === 0) return res.status(404).json({ error: 'Invalid asset class' });
    return res.json(data);
  }
  res.json(getAllPrices());
});

// GET /api/market/symbols
router.get('/symbols', (req, res) => {
  res.json(ASSETS);
});

// GET /api/market/candle/:symbol?interval=1m
router.get('/candle/:symbol', (req, res) => {
  const { symbol } = req.params;
  // Mock OHLCV - in prod fetch from provider
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
  res.json({ symbol, candles });
});

module.exports = router;

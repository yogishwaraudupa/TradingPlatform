const express = require('express');
const router = express.Router();
const { prices } = require('../services/marketData');

// Mock holdings - derived from orders in real app
let holdings = {
  'AAPL': { qty: 10, avgPrice: 175.5 },
  'BTC-USD': { qty: 0.5, avgPrice: 42000 },
  'GOLD': { qty: 2, avgPrice: 2000 }
};

router.get('/', (req, res) => {
  const positions = Object.entries(holdings).map(([symbol, h]) => {
    const ltp = prices[symbol] || 0;
    const pnl = (ltp - h.avgPrice) * h.qty;
    return { symbol, ...h, ltp: Number(ltp.toFixed(2)), pnl: Number(pnl.toFixed(2)), value: Number((ltp * h.qty).toFixed(2)) };
  });
  const totalValue = positions.reduce((a,c)=>a+c.value,0);
  const totalPnl = positions.reduce((a,c)=>a+c.pnl,0);
  res.json({ positions, totalValue: Number(totalValue.toFixed(2)), totalPnl: Number(totalPnl.toFixed(2)), cash: 50000 });
});

router.get('/holdings', (req, res) => res.json(holdings));

module.exports = router;

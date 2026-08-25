const express = require('express');
const router = express.Router();
const { prices, ASSETS } = require('../services/marketData');

// Mock holdings - derived from orders in real app
let holdings = {
  'AAPL': { qty: 10, avgPrice: 175.5 },
  'BTC-USD': { qty: 0.5, avgPrice: 42000 },
  'GOLD': { qty: 2, avgPrice: 2000 },
  'EURUSD': { qty: 1000, avgPrice: 1.08 },
  'NIFTY': { qty: 5, avgPrice: 21500 },
};

function getAssetClass(symbol){
  for(const [cls, syms] of Object.entries(ASSETS)){
    if(syms.includes(symbol)) return cls
  }
  return 'stocks'
}

router.get('/', (req, res) => {
  const positions = Object.entries(holdings).map(([symbol, h]) => {
    const ltp = prices[symbol] || h.avgPrice;
    const invested = h.avgPrice * h.qty;
    const currentValue = ltp * h.qty;
    const pnl = currentValue - invested;
    const pnlPct = invested ? (pnl/invested)*100 : 0;
    const dayChange = (Math.random()*4-2); // mock day change %
    return { 
      symbol, 
      assetClass: getAssetClass(symbol),
      qty: h.qty, 
      avgPrice: Number(h.avgPrice.toFixed(2)), 
      ltp: Number(ltp.toFixed(2)), 
      invested: Number(invested.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
      pnl: Number(pnl.toFixed(2)), 
      pnlPct: Number(pnlPct.toFixed(2)),
      dayChange: Number(dayChange.toFixed(2)),
    };
  });
  const totalInvested = positions.reduce((a,c)=>a+c.invested,0);
  const totalValue = positions.reduce((a,c)=>a+c.currentValue,0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested ? (totalPnl/totalInvested)*100 : 0;
  const totalDayPnl = positions.reduce((a,c)=> a + (c.currentValue * c.dayChange/100),0)
  // allocation
  positions.forEach(p=> p.allocation = totalValue ? Number(((p.currentValue/totalValue)*100).toFixed(2)) : 0)
  // sort by value desc
  positions.sort((a,b)=>b.currentValue - a.currentValue)

  const cash = 50000
  const netWorth = cash + totalValue

  res.json({ 
    positions, 
    totalInvested: Number(totalInvested.toFixed(2)),
    totalValue: Number(totalValue.toFixed(2)), 
    totalPnl: Number(totalPnl.toFixed(2)),
    totalPnlPct: Number(totalPnlPct.toFixed(2)),
    totalDayPnl: Number(totalDayPnl.toFixed(2)),
    cash,
    netWorth: Number(netWorth.toFixed(2)),
  });
});

// Portfolio history for chart (30 days mock)
router.get('/history', (req,res)=>{
  const history=[]
  let base = 65000
  for(let i=29;i>=0;i--){
    const noise = (Math.random()*2-1)*800
    const trend = (29-i)*120
    const val = base + trend + noise
    history.push({ date: new Date(Date.now()-i*86400000).toISOString().slice(0,10), value: Number(val.toFixed(2)) })
  }
  res.json(history)
})

router.get('/holdings', (req, res) => res.json(holdings));

// Add holding (demo)
router.post('/add', (req,res)=>{
  const { symbol, qty, avgPrice } = req.body
  if(!symbol || !qty) return res.status(400).json({error:'symbol qty required'})
  const s = symbol.toUpperCase()
  holdings[s] = { qty: Number(qty), avgPrice: avgPrice? Number(avgPrice) : (prices[s]||100) }
  res.json({ ok:true, holdings })
})

module.exports = router;

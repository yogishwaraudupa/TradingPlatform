const express = require('express');
const router = express.Router();

// In-memory order book (replace with DB)
let orders = [];
let idCounter = 1;

// POST /api/orders - place order
router.post('/', (req, res) => {
  const { symbol, assetClass, side, type, qty, price } = req.body;
  if (!symbol || !side || !qty) return res.status(400).json({ error: 'symbol, side, qty required' });
  if (!['BUY','SELL'].includes(side)) return res.status(400).json({ error: 'side must be BUY/SELL' });

  const order = {
    id: idCounter++,
    symbol, assetClass: assetClass || 'stocks',
    side, type: type || 'MARKET',
    qty: Number(qty), price: price ? Number(price) : null,
    status: 'FILLED', // mock instant fill - in prod: PENDING -> Order Matching Engine
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  res.status(201).json(order);
});

// GET /api/orders
router.get('/', (req, res) => {
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const o = orders.find(x => String(x.id) === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  res.json(o);
});

// DELETE /api/orders/:id - cancel
router.delete('/:id', (req, res) => {
  const idx = orders.findIndex(x => String(x.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  orders[idx].status = 'CANCELLED';
  res.json(orders[idx]);
});

module.exports = router;

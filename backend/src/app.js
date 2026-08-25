require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const orderRoutes = require('./routes/orders');
const portfolioRoutes = require('./routes/portfolio');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', assets: ['stocks','crypto','forex','commodity','index'] }));
app.get('/', (req, res) => res.json({ message: 'Trading Platform API - Multi Asset' }));

const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(e => console.error('Mongo error', e.message));
}

module.exports = app;

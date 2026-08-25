require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const orderRoutes = require('./routes/orders');
const portfolioRoutes = require('./routes/portfolio');
const { startPriceFeed } = require('./services/marketData');
const { setupWebSocket } = require('./ws/handler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', assets: ['stocks','crypto','forex','commodity','index'] }));
app.get('/', (req, res) => res.json({ message: 'Trading Platform API - Multi Asset' }));

// WebSocket for real-time prices
setupWebSocket(io);
startPriceFeed(io);

// DB - optional, falls back to in-memory if not configured
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(e => console.error('Mongo error', e.message));
} else {
  console.log('MONGO_URI not set - running in mock/memory mode');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

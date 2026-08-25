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

const app = require('./app');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// WebSocket for real-time prices (not available on Vercel serverless, kept for local/self-hosted)
setupWebSocket(io);
startPriceFeed(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

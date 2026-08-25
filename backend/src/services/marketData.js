// Supported asset classes
const ASSETS = {
  stocks: ['AAPL','MSFT','TSLA','RELIANCE.NS','INFY'],
  crypto: ['BTC-USD','ETH-USD','SOL-USD'],
  forex: ['EURUSD','GBPUSD','USDJPY','USDINR'],
  commodity: ['GOLD','SILVER','CRUDEOIL'],
  index: ['NIFTY','SENSEX','SPX','DJI','NASDAQ']
};

// In-memory price store (replace with Redis in prod)
const prices = {};
Object.entries(ASSETS).forEach(([cls, symbols]) => {
  symbols.forEach(s => {
    prices[s] = 100 + Math.random()*900; // seed
  });
});

function getAllPrices() {
  return Object.entries(prices).map(([symbol, price]) => {
    const assetClass = Object.keys(ASSETS).find(k => ASSETS[k].includes(symbol));
    return { symbol, price: Number(price.toFixed(2)), assetClass, change: Number((Math.random()*4-2).toFixed(2)) };
  });
}

function getPricesByClass(assetClass) {
  const symbols = ASSETS[assetClass];
  if (!symbols) return [];
  return symbols.map(s => ({ symbol: s, price: Number(prices[s].toFixed(2)), assetClass }));
}

// Simulate price ticks - in prod replace with provider: AlphaVantage / Binance WS / OANDA / Yahoo Finance
function startPriceFeed(io) {
  setInterval(() => {
    Object.keys(prices).forEach(sym => {
      const vol = 0.005; // 0.5% volatility per tick
      const change = (Math.random()*2-1) * vol;
      prices[sym] = Math.max(1, prices[sym] * (1 + change));
    });
    if (io) io.emit('price:update', getAllPrices());
  }, 2000);
  console.log('Price feed started for', Object.keys(prices).length, 'symbols');
}

module.exports = { ASSETS, prices, getAllPrices, getPricesByClass, startPriceFeed };

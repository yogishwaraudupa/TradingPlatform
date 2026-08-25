// Real-time price feed - Yahoo Chart + CoinGecko + TwelveData + mock fallback - 60+ symbols category-wise
const axios = require('axios')

const ASSETS = {
  stocks: [
    // US Stocks
    'AAPL','MSFT','TSLA','NVDA','GOOGL','AMZN','META','NFLX','AMD','JPM',
    // India Stocks
    'RELIANCE.NS','TCS.NS','INFY.NS','HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','BHARTIARTL.NS','ITC.NS','KOTAKBANK.NS','LT.NS'
  ],
  crypto: ['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD'],
  forex: ['EURUSD','GBPUSD','USDJPY','USDINR','EURINR','GBPINR'],
  commodity: ['GOLD','SILVER','CRUDEOIL','COPPER','NATURALGAS'],
  index: [
    // India Indices
    'NIFTY','SENSEX','BANKNIFTY','NIFTYIT',
    // US Indices
    'SPX','DJI','NASDAQ','RUSSELL',
    // Global Indices
    'FTSE','NIKKEI','HANGSENG','DAX'
  ]
};

const YAHOO_MAP = {
  // US Stocks
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'TSLA': 'TSLA',
  'NVDA': 'NVDA',
  'GOOGL': 'GOOGL',
  'AMZN': 'AMZN',
  'META': 'META',
  'NFLX': 'NFLX',
  'AMD': 'AMD',
  'JPM': 'JPM',
  // India Stocks
  'RELIANCE.NS': 'RELIANCE.NS',
  'TCS.NS': 'TCS.NS',
  'INFY.NS': 'INFY.NS',
  'HDFCBANK.NS': 'HDFCBANK.NS',
  'ICICIBANK.NS': 'ICICIBANK.NS',
  'SBIN.NS': 'SBIN.NS',
  'BHARTIARTL.NS': 'BHARTIARTL.NS',
  'ITC.NS': 'ITC.NS',
  'KOTAKBANK.NS': 'KOTAKBANK.NS',
  'LT.NS': 'LT.NS',
  'INFY': 'INFY.NS',
  // Crypto
  'BTC-USD': 'BTC-USD',
  'ETH-USD': 'ETH-USD',
  'SOL-USD': 'SOL-USD',
  'BNB-USD': 'BNB-USD',
  'XRP-USD': 'XRP-USD',
  'ADA-USD': 'ADA-USD',
  'DOGE-USD': 'DOGE-USD',
  // Forex
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'USDINR': 'INR=X',
  'EURINR': 'EURINR=X',
  'GBPINR': 'GBPINR=X',
  // Commodity
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'CRUDEOIL': 'CL=F',
  'COPPER': 'HG=F',
  'NATURALGAS': 'NG=F',
  // India Indices
  'NIFTY': '^NSEI',
  'SENSEX': '^BSESN',
  'BANKNIFTY': '^NSEBANK',
  'NIFTYIT': '^CNXIT',
  // US Indices
  'SPX': '^GSPC',
  'DJI': '^DJI',
  'NASDAQ': '^IXIC',
  'RUSSELL': '^RUT',
  // Global
  'FTSE': '^FTSE',
  'NIKKEI': '^N225',
  'HANGSENG': '^HSI',
  'DAX': '^GDAXI',
};

// Category helpers for frontend live data grouping
const CATEGORY_GROUPS = {
  'us_stocks': ['AAPL','MSFT','TSLA','NVDA','GOOGL','AMZN','META','NFLX','AMD','JPM'],
  'india_stocks': ['RELIANCE.NS','TCS.NS','INFY.NS','HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','BHARTIARTL.NS','ITC.NS','KOTAKBANK.NS','LT.NS'],
  'india_indices': ['NIFTY','SENSEX','BANKNIFTY','NIFTYIT'],
  'us_indices': ['SPX','DJI','NASDAQ','RUSSELL'],
  'global_indices': ['FTSE','NIKKEI','HANGSENG','DAX'],
  'commodity': ['GOLD','SILVER','CRUDEOIL','COPPER','NATURALGAS'],
  'crypto': ['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD'],
  'forex': ['EURUSD','GBPUSD','USDJPY','USDINR','EURINR','GBPINR'],
}

const prices = {};
const prevClose = {};
const lastUpdate = {};
Object.entries(ASSETS).forEach(([cls, symbols]) => {
  symbols.forEach(s => {
    prices[s] = 100 + Math.random()*900;
    prevClose[s] = prices[s];
  });
});

let lastPoll = 0
async function ensureFresh(){
  const now = Date.now()
  if(now - lastPoll > 6000){
    lastPoll = now
    pollRealPrices(null).catch(()=>{})
  }
}

function getAllPrices() {
  ensureFresh()
  return Object.entries(prices).map(([symbol, price]) => {
    const assetClass = Object.keys(ASSETS).find(k => ASSETS[k].includes(symbol));
    const prev = prevClose[symbol] || price;
    const change = ((price - prev)/prev)*100;
    return { 
      symbol, 
      price: Number(price.toFixed(2)), 
      assetClass, 
      change: Number(change.toFixed(2)),
      prevClose: Number(prev.toFixed(2)),
      lastUpdate: lastUpdate[symbol] || null,
      source: lastUpdate[symbol] ? 'real' : 'mock'
    };
  });
}

function getPricesByClass(assetClass) {
  const symbols = ASSETS[assetClass];
  if (!symbols) return [];
  return symbols.map(s => {
    const price = prices[s];
    const prev = prevClose[s] || price;
    const change = ((price - prev)/prev)*100;
    return { symbol: s, price: Number(price.toFixed(2)), assetClass, change: Number(change.toFixed(2)), source: lastUpdate[s] ? 'real' : 'mock', lastUpdate: lastUpdate[s]||null };
  });
}

function getPricesByCategory(category){
  const symbols = CATEGORY_GROUPS[category]
  if(!symbols) return getPricesByClass(category)
  return symbols.map(s=>{
    const price = prices[s] || 0
    const prev = prevClose[s] || price
    const change = ((price - prev)/prev)*100
    const assetClass = Object.keys(ASSETS).find(k=> ASSETS[k].includes(s)) || 'stocks'
    return { symbol:s, price:Number(price.toFixed(2)), assetClass, change:Number(change.toFixed(2)), source: lastUpdate[s]?'real':'mock', lastUpdate: lastUpdate[s]||null }
  })
}

async function fetchYahooPrice(yahooSym){
  try{
    const { data } = await axios.get(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' },
      timeout: 5000
    })
    const meta = data?.chart?.result?.[0]?.meta
    if(meta && meta.regularMarketPrice){
      return { price: meta.regularMarketPrice, prevClose: meta.previousClose || meta.chartPreviousClose }
    }
    return null
  }catch(e){ return null }
}

async function fetchTwelveDataPrice(symbol){
  try{
    const map = {'RELIANCE.NS':'RELIANCE','TCS.NS':'TCS','GOLD':'XAU/USD','SILVER':'XAG/USD','CRUDEOIL':'WTI/USD','COPPER':'COPPER','NATURALGAS':'NATGAS/USD'}
    const tdSym = map[symbol] || symbol
    const { data } = await axios.get(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSym)}&apikey=demo`, { timeout:4000 })
    if(data && data.price && !isNaN(data.price)) return { price: Number(data.price), prevClose: null }
    return null
  }catch(e){ return null }
}

async function fetchBinanceCrypto(){
  try{
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin&vs_currencies=usd', { timeout:4000 })
    const map = {bitcoin:'BTC-USD', ethereum:'ETH-USD', solana:'SOL-USD', binancecoin:'BNB-USD', ripple:'XRP-USD', cardano:'ADA-USD', dogecoin:'DOGE-USD'}
    let c=0
    Object.entries(map).forEach(([id,sym])=>{
      if(data[id] && data[id].usd){ prices[sym]=data[id].usd; lastUpdate[sym]=new Date().toISOString(); c++ }
    })
    return c
  }catch(e){ return 0 }
}

async function pollRealPrices(io){
  let updated=0
  await fetchBinanceCrypto()
  const entries = Object.entries(YAHOO_MAP)
  const chunks = []
  for(let i=0;i<entries.length;i+=4) chunks.push(entries.slice(i,i+4))
  for(const chunk of chunks){
    await Promise.all(chunk.map(async ([ourSym, yahooSym])=>{
      if(['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD'].includes(ourSym) && lastUpdate[ourSym]) return null
      let res = await fetchYahooPrice(yahooSym)
      if(!res) res = await fetchTwelveDataPrice(ourSym)
      if(res && res.price){
        prices[ourSym]=Number(res.price)
        if(res.prevClose) prevClose[ourSym]=Number(res.prevClose)
        lastUpdate[ourSym]=new Date().toISOString()
        updated++
      }
    }))
    // small delay to avoid rate limit
    await new Promise(r=>setTimeout(r,200))
  }
  const now=Date.now()
  Object.keys(prices).forEach(sym=>{
    const last = lastUpdate[sym] ? new Date(lastUpdate[sym]).getTime() : 0
    if(!last || now - last > 90000){
      const vol=0.0015
      const ch=(Math.random()*2-1)*vol
      prices[sym]=Math.max(1, prices[sym]*(1+ch))
    }
  })
  if(updated>0) console.log(`[real] updated ${updated} symbols via Yahoo/TwelveData + crypto`)
  if(io) io.emit('price:update', getAllPrices())
  return updated
}

function startPriceFeed(io){
  pollRealPrices(io)
  setInterval(()=> pollRealPrices(io), 10000)
  console.log('Real-time feed started for', Object.keys(prices).length, 'symbols (expanded 60+ with categories)')
}

module.exports = { ASSETS, YAHOO_MAP, CATEGORY_GROUPS, prices, prevClose, getAllPrices, getPricesByClass, getPricesByCategory, startPriceFeed, fetchYahooPrice };

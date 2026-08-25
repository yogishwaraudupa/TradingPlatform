// Real-time price feed - Yahoo Chart + TwelveData + Binance + mock fallback
const axios = require('axios')

const ASSETS = {
  stocks: ['AAPL','MSFT','TSLA','RELIANCE.NS','INFY'],
  crypto: ['BTC-USD','ETH-USD','SOL-USD'],
  forex: ['EURUSD','GBPUSD','USDJPY','USDINR'],
  commodity: ['GOLD','SILVER','CRUDEOIL'],
  index: ['NIFTY','SENSEX','SPX','DJI','NASDAQ']
};

const YAHOO_MAP = {
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'TSLA': 'TSLA',
  'RELIANCE.NS': 'RELIANCE.NS',
  'INFY': 'INFY',
  'BTC-USD': 'BTC-USD',
  'ETH-USD': 'ETH-USD',
  'SOL-USD': 'SOL-USD',
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'USDINR': 'INR=X',
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'CRUDEOIL': 'CL=F',
  'NIFTY': '^NSEI',
  'SENSEX': '^BSESN',
  'SPX': '^GSPC',
  'DJI': '^DJI',
  'NASDAQ': '^IXIC',
};

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
  // trigger background refresh for serverless (Vercel) - non-blocking
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
    return { symbol: s, price: Number(price.toFixed(2)), assetClass, change: Number(change.toFixed(2)), source: lastUpdate[s] ? 'real' : 'mock' };
  });
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
    // TwelveData demo works for stocks, map our symbol to TwelveData format
    const map = {'RELIANCE.NS':'RELIANCE','GOLD':'XAU/USD','SILVER':'XAG/USD','CRUDEOIL':'WTI/USD'}
    const tdSym = map[symbol] || symbol
    const { data } = await axios.get(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSym)}&apikey=demo`, { timeout:4000 })
    if(data && data.price && !isNaN(data.price)) return { price: Number(data.price), prevClose: null }
    return null
  }catch(e){ return null }
}

async function fetchBinanceCrypto(){
  try{
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd', { timeout:4000 })
    if(data.bitcoin) { prices['BTC-USD']=data.bitcoin.usd; prevClose['BTC-USD']=prevClose['BTC-USD']||data.bitcoin.usd; lastUpdate['BTC-USD']=new Date().toISOString() }
    if(data.ethereum) { prices['ETH-USD']=data.ethereum.usd; lastUpdate['ETH-USD']=new Date().toISOString() }
    if(data.solana) { prices['SOL-USD']=data.solana.usd; lastUpdate['SOL-USD']=new Date().toISOString() }
    return 3
  }catch(e){ return 0 }
}

async function pollRealPrices(io){
  let updated=0
  // Crypto via CoinGecko (most reliable, no key)
  await fetchBinanceCrypto()
  
  // For stocks/forex/commodity/index - use Yahoo chart in parallel with concurrency 5
  const entries = Object.entries(YAHOO_MAP)
  const chunks = []
  for(let i=0;i<entries.length;i+=5) chunks.push(entries.slice(i,i+5))
  
  for(const chunk of chunks){
    const results = await Promise.all(chunk.map(async ([ourSym, yahooSym])=>{
      // Skip crypto already updated via CoinGecko if we want, but Yahoo also works
      if(['BTC-USD','ETH-USD','SOL-USD'].includes(ourSym) && lastUpdate[ourSym]) return null
      let res = await fetchYahooPrice(yahooSym)
      if(!res) res = await fetchTwelveDataPrice(ourSym)
      if(res && res.price){
        prices[ourSym]=Number(res.price)
        if(res.prevClose) prevClose[ourSym]=Number(res.prevClose)
        lastUpdate[ourSym]=new Date().toISOString()
        updated++
      }
      return res
    }))
  }

  // Mock drift for any stale (>90s) to keep UI live
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
  setInterval(()=> pollRealPrices(io), 8000) // real poll 8s to avoid rate limit
  console.log('Real-time feed started (Yahoo Chart + CoinGecko + TwelveData + mock fallback) for', Object.keys(prices).length, 'symbols')
}

module.exports = { ASSETS, YAHOO_MAP, prices, prevClose, getAllPrices, getPricesByClass, startPriceFeed, fetchYahooPrice };

const express = require('express');
const router = express.Router();
const { ASSETS, YAHOO_MAP, getAllPrices, getPricesByClass, fetchYahooQuotes } = require('../services/marketData');
const axios = require('axios');

// GET /api/market/classes -> list asset classes
router.get('/classes', (req, res) => {
  res.json(Object.keys(ASSETS));
});

// GET /api/market/prices?class=crypto -> real-time prices (tries Yahoo live first)
router.get('/prices', async (req, res) => {
  const { class: assetClass, refresh } = req.query;
  if(refresh === '1'){
    await fetchYahooQuotes().catch(()=>{})
  }
  if (assetClass) {
    const data = getPricesByClass(assetClass);
    if (data.length === 0) return res.status(404).json({ error: 'Invalid asset class' });
    return res.json(data);
  }
  res.json(getAllPrices());
});

// Country -> exchange mapping for country-wise search
const COUNTRY_EXCHANGES = {
  india: ['NSE','BSE','NS','BO','Bombay','National Stock'],
  usa: ['NYSE','NASDAQ','Nasdaq','NYQ','NMS','NGM','NYSEMkt','NYSEArca','OTC','NYSE MKT'],
  uk: ['LSE','London','AIM'],
  japan: ['TSE','Tokyo','JPX','Osaka'],
  germany: ['GER','Xetra','Frankfurt','XETRA','HAM','MUN'],
  china: ['HKG','Hong Kong','SHA','SHE','SSE','SZSE'],
  canada: ['TOR','TSX','Toronto','Venture'],
  australia: ['ASX','Sydney','AX'],
  france: ['PAR','Paris','EPA'],
  singapore: ['SES','Singapore','SGX'],
  hongkong: ['HKG','Hong Kong','HK'],
  brazil: ['SAO','Sao Paulo','BVMF'],
};

function exchangeToCountry(exch){
  if(!exch) return 'global'
  const e = exch.toUpperCase()
  for(const [country, patterns] of Object.entries(COUNTRY_EXCHANGES)){
    if(patterns.some(p=> e.includes(p.toUpperCase()))) return country
  }
  // also detect suffix
  if(e.endsWith('.NS') || e.endsWith('.BO') || e==='NSE' || e==='BSE') return 'india'
  if(e.endsWith('.L')) return 'uk'
  if(e.endsWith('.T') || e.endsWith('.JP')) return 'japan'
  if(e.endsWith('.DE') || e.endsWith('.F')) return 'germany'
  if(e.endsWith('.HK') || e.endsWith('.SS') || e.endsWith('.SZ')) return 'china'
  if(e.endsWith('.TO') || e.endsWith('.V')) return 'canada'
  if(e.endsWith('.AX')) return 'australia'
  if(e.endsWith('.PA')) return 'france'
  if(e.endsWith('.SI')) return 'singapore'
  if(e==='NYSE' || e==='NASDAQ' || e.includes('NASDAQ')) return 'usa'
  return 'global'
}

// GET /api/market/search?q=RELIANCE -> Yahoo search with country-wise filter
router.get('/search', async (req,res)=>{
  const q = (req.query.q || '').trim()
  if(!q) return res.json([])
  const typeFilter = (req.query.type || '').toLowerCase() // stocks,index,commodity,forex,crypto
  const countryFilter = (req.query.country || '').toLowerCase() // india,usa,uk,japan,germany etc or all
  try{
    const { data } = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`, {
      headers:{'User-Agent':'Mozilla/5.0', 'Accept':'application/json'},
      timeout:5000
    })
    let quotes = (data.quotes||[]).slice(0,25).map(x=>{
      const exch = x.exchDisp || x.exchange || ''
      const country = exchangeToCountry(exch || x.symbol)
      return {
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        longName: x.longname,
        exchange: exch,
        quoteType: x.quoteType, // EQUITY, INDEX, FUTURE, ETF, CURRENCY, CRYPTOCURRENCY
        score: x.score,
        country,
        assetClass: x.quoteType==='INDEX' ? 'index' : x.quoteType==='FUTURE' ? 'commodity' : x.quoteType==='CURRENCY' ? 'forex' : x.quoteType==='CRYPTOCURRENCY' ? 'crypto' : 'stocks'
      }
    })
    if(typeFilter){
      const map={stocks:['EQUITY','ETF'], index:['INDEX'], commodity:['FUTURE'], forex:['CURRENCY'], crypto:['CRYPTOCURRENCY']}
      const allowed = map[typeFilter] || []
      if(allowed.length) quotes = quotes.filter(x=> allowed.includes(x.quoteType))
    }
    if(countryFilter && countryFilter!=='all'){
      quotes = quotes.filter(x=> x.country===countryFilter)
      // if country filter yields 0, fallback to showing all but sorted with country matches first
      if(quotes.length===0){
        // no strict match, try looser: symbol suffix
        const suffixMap={india:['.NS','.BO'], usa:[], uk:['.L'], japan:['.T','.JP'], germany:['.DE','.F'], china:['.HK','.SS','.SZ'], canada:['.TO','.V'], australia:['.AX'], france:['.PA'], singapore:['.SI']}
        const suffixes = suffixMap[countryFilter] || []
        // already filtered to 0, just return empty but add hint
      }
    }
    // limit 15 after filter
    quotes = quotes.slice(0,15)
    res.json(quotes)
  }catch(e){
    console.log('search failed', e.message)
    res.status(500).json({ error: e.message, q })
  }
});

// GET /api/market/countries -> list supported countries for stocks/indices
router.get('/countries', (req,res)=>{
  res.json(Object.keys(COUNTRY_EXCHANGES).map(k=>({ id:k, label: k.charAt(0).toUpperCase()+k.slice(1), exchanges: COUNTRY_EXCHANGES[k].slice(0,3) })))
});

// GET /api/market/symbols
router.get('/symbols', (req, res) => {
  res.json({ assets: ASSETS, yahooMap: YAHOO_MAP });
});

// GET /api/market/quote/:symbol -> live single quote from Yahoo
router.get('/quote/:symbol', async (req,res)=>{
  const { symbol } = req.params;
  const yahooSym = YAHOO_MAP[symbol] || symbol;
  try{
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSym}`, {
      headers:{'User-Agent':'Mozilla/5.0'}, timeout:5000
    })
    const q = data?.quoteResponse?.result?.[0]
    if(!q) return res.status(404).json({error:'Not found', symbol, yahooSym})
    res.json({
      symbol,
      yahooSymbol: yahooSym,
      price: q.regularMarketPrice,
      prevClose: q.regularMarketPreviousClose,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      currency: q.currency,
      marketState: q.marketState,
      source: 'yahoo'
    })
  }catch(e){
    res.status(500).json({error:e.message, symbol, yahooSym})
  }
})

// GET /api/market/candle/:symbol?interval=1m -> try Yahoo chart, fallback mock
router.get('/candle/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const yahooSym = YAHOO_MAP[symbol] || symbol;
  const interval = req.query.interval || '1m';
  try{
    // Try Yahoo chart API for real candles
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=${interval}&range=1d`, {
      headers:{'User-Agent':'Mozilla/5.0'}, timeout:6000
    })
    const result = data?.chart?.result?.[0]
    if(result && result.timestamp && result.indicators?.quote?.[0]){
      const ts = result.timestamp
      const q = result.indicators.quote[0]
      const candles = ts.map((t,i)=>({
        time: t*1000,
        open: q.open[i] ?? q.close[i],
        high: q.high[i] ?? q.close[i],
        low: q.low[i] ?? q.close[i],
        close: q.close[i],
        volume: q.volume[i] ?? 0,
      })).filter(c=> c.close!=null).slice(-50)
      if(candles.length>=10){
        return res.json({ symbol, yahooSymbol: yahooSym, source:'yahoo', interval, candles })
      }
    }
  }catch(e){
    console.log('Yahoo candle failed for', yahooSym, e.message)
  }
  // Fallback mock OHLCV
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
  res.json({ symbol, yahooSymbol: yahooSym, source:'mock', interval, candles });
});

module.exports = router;

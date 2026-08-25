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

// GET /api/market/candle/:symbol?interval=1m&range=1d -> extended history
router.get('/candle/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const yahooSym = YAHOO_MAP[symbol] || symbol;
  const interval = req.query.interval || '1m';
  const range = req.query.range || '1d'; // 1d,5d,1mo,3mo,6mo,1y,2y,5y,max
  // map range to limit - full market day 390 candles for 1d, extend for longer
  const limitMap = {'1d':390,'5d':390,'1mo':120,'3mo':120,'6mo':150,'1y':250,'2y':400,'5y':500,'max':500}
  const limit = limitMap[range] || 390
  try{
    const { data } = await axios.get(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`, {
      headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout:8000
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
      })).filter(c=> c.close!=null).slice(-limit)
      if(candles.length>=10){
        return res.json({ symbol, yahooSymbol: yahooSym, source:'yahoo', interval, range, candles })
      }
    }
  }catch(e){
    console.log('Yahoo candle failed for', yahooSym, range, e.message)
  }
  // Fallback mock extended
  const len = Math.min(limit, 500)
  const candles = Array.from({ length: len }, (_, i) => {
    const base = 100 + Math.sin(i/10)*15 + (i/len)*20 + Math.random()*3;
    return {
      time: Date.now() - (len-i)* (range==='1d'?60000 : range==='5d'?300000 : 86400000),
      open: Number((base).toFixed(2)),
      high: Number((base+2).toFixed(2)),
      low: Number((base-2).toFixed(2)),
      close: Number((base+Math.random()*2-1).toFixed(2)),
      volume: Math.floor(Math.random()*10000)
    };
  });
  res.json({ symbol, yahooSymbol: yahooSym, source:'mock', interval, range, candles });
});

module.exports = router;

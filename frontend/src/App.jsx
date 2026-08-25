import React, { useEffect, useState, useMemo } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import Portfolio from './Portfolio.jsx'
import TradingViewChart from './TradingViewChart.jsx'
import LiveData from './LiveData.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CLASSES = [
  { id:'stocks', label:'STOCKS', icon:'📈' },
  { id:'crypto', label:'CRYPTO', icon:'₿' },
  { id:'forex', label:'FOREX', icon:'💱' },
  { id:'commodity', label:'COMMODITY', icon:'🥇' },
  { id:'index', label:'INDEX', icon:'📊' },
]

// --- Indicator helpers ---
function sma(data, period, key='close'){ return data.map((d,i)=>{ if(i<period-1) return {...d, [`sma${period}`]:null}; const sum=data.slice(i-period+1,i+1).reduce((a,c)=>a+c[key],0); return {...d, [`sma${period}`]: Number((sum/period).toFixed(2)) }})}
function ema(data, period, key='close'){ let k=2/(period+1); let prev=null; return data.map((d,i)=>{ const val=d[key]; if(i===0) prev=val; else prev = val*k + prev*(1-k); return {...d, [`ema${period}`]: Number(prev.toFixed(2)) }})}
function rsi(data, period=14){
  let gains=0, losses=0
  return data.map((d,i)=>{
    if(i===0) return {...d, rsi:50}
    const change = d.close - data[i-1].close
    const gain = Math.max(0, change), loss = Math.max(0, -change)
    if(i<period){ gains+=gain; losses+=loss; return {...d, rsi:50}}
    if(i===period){ gains/=period; losses/=period } else { gains = (gains*(period-1)+gain)/period; losses=(losses*(period-1)+loss)/period}
    const rs = losses===0?100:gains/losses
    const rsiVal = 100 - (100/(1+rs))
    return {...d, rsi: Number(rsiVal.toFixed(2))}
  })
}
function bollinger(data, period=20, mult=2){
  return data.map((d,i)=>{
    if(i<period-1) return {...d, bbUpper:null, bbLower:null, bbMid:null}
    const slice=data.slice(i-period+1,i+1).map(x=>x.close)
    const mid=slice.reduce((a,b)=>a+b,0)/period
    const std=Math.sqrt(slice.reduce((a,b)=>a+Math.pow(b-mid,2),0)/period)
    return {...d, bbMid:Number(mid.toFixed(2)), bbUpper:Number((mid+mult*std).toFixed(2)), bbLower:Number((mid-mult*std).toFixed(2))}
  })
}
function macd(data){
  let ema12=ema(data,12), ema26=ema(data,26)
  let withMacd = data.map((d,i)=>({...d, macd: Number((ema12[i].ema12 - ema26[i].ema26).toFixed(2))}))
  let signal = ema(withMacd.map(d=>({close:d.macd})),9)
  return withMacd.map((d,i)=>({...d, macdSignal: signal[i].ema9, macdHist: Number((d.macd - signal[i].ema9).toFixed(2))}))
}
function enrich(data){
  if(!data.length) return data
  let d=[...data]
  d=sma(d,20); d=sma(d,50); d=ema(d,20); d=rsi(d,14); d=bollinger(d,20); d=macd(d)
  // add candle helpers for custom rendering
  return d.map(x=>({...x, isUp: x.close>=x.open, body: [x.open, x.close], wick: [x.low, x.high]}))
}

function CandleBar(props){
  const { x, y, width, height, payload } = props
  if(!payload) return null
  const color = payload.isUp ? '#0ecb81' : '#f6465d'
  // y/height is for body, wick needs manual scale - use height from open-close, wick line uses high-low ratio approximated via y
  // For simplicity draw body as rect and wick as line centered
  const cx = x + width/2
  // body rect already positioned by Recharts using payload.body range; we just color it
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(1,height)} fill={color} stroke={color} rx={1} />
      {/* wick - drawn as thin line; estimate high/low line using payload high/low relative to body */}
      <line x1={cx} x2={cx} y1={y-6} y2={y+height+6} stroke={color} strokeWidth={1} opacity={0.9} />
    </g>
  )
}

function Login({ onLogin }){
  const [userid, setUserid] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleSubmit = async (e)=>{
    e.preventDefault()
    if(!userid.trim() || !password.trim()){ setError('User ID and Password required'); return }
    setLoading(true); setError('')
    try{
      const { data } = await axios.post(`${API}/api/auth/login`, { userid, email: userid, password })
      localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); onLogin(data.user)
    }catch{
      const mockUser = { email: userid.toLowerCase().trim(), name: userid }
      localStorage.setItem('token', 'demo_token'); localStorage.setItem('user', JSON.stringify(mockUser)); onLogin(mockUser)
    }finally{ setLoading(false)}
  }
  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'radial-gradient(800px 400px at 50% -10%, rgba(240,185,11,0.15), transparent), #0b0e11', padding:16}}>
      <div style={{width:'100%', maxWidth:400, background:'#1e2329', border:'1px solid #2b3139', borderRadius:20, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
        <div style={{textAlign:'center', marginBottom:20}}>
          <div style={{display:'inline-flex', alignItems:'center', gap:8, background:'#f0b90b', color:'#111', padding:'6px 12px', borderRadius:10, fontWeight:800, fontSize:13}}>◼ TRADING TERMINAL</div>
          <h2 style={{margin:'14px 0 6px 0'}}>Welcome back</h2>
          <p style={{opacity:0.6, fontSize:13, margin:0}}>Login • Any User ID / Password works • Case-insensitive</p>
        </div>
        <form onSubmit={handleSubmit} style={{display:'grid', gap:12}}>
          <div><label style={{fontSize:12,opacity:0.7}}>User ID</label><input className="input" placeholder="e.g. admin, Demo" value={userid} onChange={e=>setUserid(e.target.value)} autoFocus /></div>
          <div><label style={{fontSize:12,opacity:0.7}}>Password</label><input className="input" type="password" placeholder="e.g. 1234, ANY" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          {error && <div style={{color:'#f6465d', fontSize:12, background:'rgba(246,70,93,0.12)', padding:'8px 10px', borderRadius:8, border:'1px solid rgba(246,70,93,0.3)'}}>{error}</div>}
          <button type="submit" className="btn" style={{background:'#f0b90b', color:'#111', fontSize:15, padding:'12px', marginTop:4}} disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
          <div style={{textAlign:'center', fontSize:11, opacity:0.5}}>Demo: <b>any</b> ID & password accepted • Try <code>ADMIN / 1234</code></div>
        </form>
      </div>
    </div>
  )
}

export default function App(){
  const [user, setUser] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}})
  const [prices, setPrices] = useState([])
  const [cls, setCls] = useState('crypto')
  const [selected, setSelected] = useState('BTC-USD')
  const [orders, setOrders] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [candles, setCandles] = useState([])
  const [chartType, setChartType] = useState('candle') // candle | line | area
  const [ind, setInd] = useState({ sma20:true, sma50:false, ema20:false, bb:false, volume:true, rsi:true, macd:false })
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showLiveData, setShowLiveData] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [customSymbols, setCustomSymbols] = useState([])
  const [country, setCountry] = useState('all')
  const [countries, setCountries] = useState([])
  const [range, setRange] = useState('1d')
  const [cagr, setCagr] = useState(20)
  const [cagrPeriods, setCagrPeriods] = useState(90)
  const [showCagr, setShowCagr] = useState(false)

  const handleLogout = ()=>{ localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) }

  useEffect(()=>{
    if(!user) return
    let socket; try{ socket=io(API,{transports:['websocket','polling']}); socket.on('price:update', d=>setPrices(d)); }catch{}
    const poll=setInterval(async()=>{ try{ const {data}=await axios.get(`${API}/api/market/prices`); if(data.length) setPrices(data)}catch{}},3000)
    return ()=>{ try{socket?.disconnect()}catch{}; clearInterval(poll)}
  },[user])
  useEffect(()=>{ if(!user) return; axios.get(`${API}/api/portfolio`).then(r=>setPortfolio(r.data)).catch(()=>{}); axios.get(`${API}/api/orders`).then(r=>setOrders(r.data)).catch(()=>{}); axios.get(`${API}/api/market/countries`).then(r=>setCountries(r.data)).catch(()=>{})},[user])
  useEffect(()=>{
    if(!user) return;
    const intervalMap = { '1d':'1m', '5d':'5m', '1mo':'30m', '3mo':'1d', '6mo':'1d', '1y':'1d', '2y':'1wk', '5y':'1wk', 'max':'1mo' }
    const interval = intervalMap[range] || '1m'
    axios.get(`${API}/api/market/candle/${selected}?range=${range}&interval=${interval}`).then(r=>setCandles(r.data.candles||[])).catch(()=>setCandles([]))
  },[selected,user,range])

  const allPrices = useMemo(()=> [...prices, ...customSymbols.filter(c=>!prices.find(p=>p.symbol===c.symbol))], [prices, customSymbols])
  const filtered = useMemo(()=> allPrices.filter(p=>p.assetClass===cls), [allPrices,cls])
  const selPrice = useMemo(()=> prices.find(p=>p.symbol===selected), [prices,selected])
  // search debounce with country filter
  useEffect(()=>{
    if(!searchQ.trim()){ setSearchRes([]); setSearchOpen(false); return }
    const t=setTimeout(async()=>{
      try{
        const { data } = await axios.get(`${API}/api/market/search?q=${encodeURIComponent(searchQ)}&country=${country}`)
        setSearchRes(Array.isArray(data)? data : [])
        setSearchOpen(true)
      }catch{ setSearchRes([])}
    },400)
    return ()=>clearTimeout(t)
  },[searchQ, country])

  const handleSelectSearch = (item)=>{
    const sym = item.symbol
    // add to custom watchlist if not in ASSETS
    if(!prices.find(p=>p.symbol===sym) && !customSymbols.find(c=>c.symbol===sym)){
      setCustomSymbols(prev=>[...prev, { symbol: sym, price: 0, assetClass: item.assetClass, change:0, name:item.name }])
    }
    setSelected(sym)
    // switch tab to item's class for context
    if(item.assetClass) setCls(item.assetClass)
    setSearchQ(''); setSearchOpen(false)
  }

  // fallback quote for custom searched symbols not in prices
  useEffect(()=>{
    if(!selected || prices.find(p=>p.symbol===selected)) return
    axios.get(`${API}/api/market/quote/${encodeURIComponent(selected)}`).then(r=>{
      const q=r.data
      if(q && q.price) setPrices(prev=>[...prev, { symbol:selected, price:q.price, assetClass: q.quoteType ? (q.quoteType==='INDEX'?'index': q.quoteType==='FUTURE'?'commodity':'stocks') : 'stocks', change: q.changePercent||0, source:'real' }])
    }).catch(()=>{})
  },[selected])

  useEffect(()=>{ if(filtered.length && !filtered.find(f=>f.symbol===selected) && !customSymbols.find(c=>c.symbol===selected)) setSelected(filtered[0].symbol)},[filtered])
  const enriched = useMemo(()=> enrich(candles), [candles])
  const cagrLine = useMemo(()=>{
    if(!showCagr || !enriched.length) return []
    const last = enriched[enriched.length-1]
    const startPrice = last.close
    const startTime = last.time
    const dailyRate = Math.pow(1 + Number(cagr)/100, 1/252) - 1 // per trading day
    const intervalMs = 86400000 // daily steps for projection
    const points = []
    for(let i=0;i<=Number(cagrPeriods);i++){
      const value = startPrice * Math.pow(1+dailyRate, i)
      points.push({ time: startTime + i*intervalMs, value: Number(value.toFixed(2)), label: `${cagr}% CAGR` })
    }
    return points
  },[showCagr, enriched, cagr, cagrPeriods])

  // Live candle update as market moves - fixes 9:00-9:43 static time to real concurrent time
  useEffect(()=>{
    if(!selPrice || !candles.length) return
    const intervalMsMap = {'1d':60000,'5d':300000,'1mo':1800000,'3mo':86400000,'6mo':86400000,'1y':86400000,'2y':604800000,'5y':604800000}
    const intervalMs = intervalMsMap[range] || 60000
    setCandles(prev=>{
      if(!prev.length) return prev
      const last = prev[prev.length-1]
      const now = Date.now()
      // if new interval has started, push new candle with current price as open/high/low/close
      if(now - last.time > intervalMs){
        const newCandle = { time: now, open: selPrice.price, high: selPrice.price, low: selPrice.price, close: selPrice.price, volume: Math.floor(Math.random()*5000)+1000 }
        return [...prev.slice(-389), newCandle]
      }
      // otherwise update last candle live
      const updated = { ...last, close: selPrice.price, high: Math.max(last.high, selPrice.price), low: Math.min(last.low, selPrice.price) }
      return [...prev.slice(0,-1), updated]
    })
  },[selPrice?.price])

  const placeOrder = async (side)=>{
    if(!qty || qty<=0) return alert('Enter valid qty')
    try{ await axios.post(`${API}/api/orders`, { symbol:selected, assetClass:cls, side, qty:Number(qty), type:orderType }); const {data}=await axios.get(`${API}/api/orders`); setOrders(data); const {data:pf}=await axios.get(`${API}/api/portfolio`); setPortfolio(pf)}catch(e){alert(e?.response?.data?.error||e.message)}
  }

  if(!user) return <Login onLogin={setUser} />

  return (
    <div>
      <div className="header">
        <div className="logo"><span style={{background:'#f0b90b', color:'#111', padding:'4px 8px', borderRadius:8, fontSize:12}}>◼</span> TRADING<span>TERMINAL</span> <span className="badge">PRO • 5 ASSETS</span></div>
        <div className="tabs">{CLASSES.map(c=> <button key={c.id} onClick={()=>setCls(c.id)} className={`tab ${cls===c.id?'active':''}`}>{c.icon} {c.label}</button>)}</div>
        <div style={{position:'relative', marginLeft:8, display:'flex', gap:6}}>
          <div style={{position:'relative'}}>
            <input className="input" style={{width:260, padding:'8px 12px 8px 32px', fontSize:12, background:'#0b0e11'}} placeholder="🔍 Search all: AAPL, NIFTY, GOLD, TCS..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} onFocus={()=>searchRes.length&&setSearchOpen(true)} />
            <span style={{position:'absolute', left:10, top:9, opacity:0.5, fontSize:12}}>🔍</span>
            {searchOpen && searchRes.length>0 && (
              <div style={{position:'absolute', top:42, left:0, right:0, width:380, background:'#1e2329', border:'1px solid #2b3139', borderRadius:12, zIndex:30, maxHeight:360, overflow:'auto', boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}>
                {searchRes.map(r=>(
                  <div key={r.symbol} onClick={()=>handleSelectSearch(r)} style={{padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid rgba(43,49,57,0.4)', display:'flex', justifyContent:'space-between', alignItems:'center'}} className="watch-item">
                    <div><div className="sym" style={{fontSize:12}}>{r.symbol} <span className="badge" style={{fontSize:10, marginLeft:6}}>{r.quoteType}</span> <span className="badge" style={{fontSize:9, background:'#181a20'}}>{r.country.toUpperCase()}</span></div><div style={{fontSize:11, opacity:0.6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200}}>{r.name} • {r.exchange}</div></div>
                    <div className="badge" style={{background: r.assetClass==='index'?'rgba(0,191,255,0.15)': r.assetClass==='commodity'?'rgba(255,140,0,0.15)': r.assetClass==='crypto'?'rgba(167,139,250,0.15)':'#2b3139', fontSize:10}}>{r.assetClass.toUpperCase()}</div>
                  </div>
                ))}
                <div style={{padding:'6px 12px', fontSize:10, opacity:0.5, textAlign:'center'}}>Yahoo Finance • {searchRes.length} results for "{searchQ}" {country!=='all' && `• ${country.toUpperCase()}`}</div>
              </div>
            )}
          </div>
          <select value={country} onChange={e=>setCountry(e.target.value)} className="input" style={{width:130, padding:'8px', fontSize:11, background:'#1e2329'}}>
            <option value="all">🌍 All Countries</option>
            <option value="india">🇮🇳 India (NSE/BSE)</option>
            <option value="usa">🇺🇸 USA (NYSE/NASDAQ)</option>
            <option value="uk">🇬🇧 UK (LSE)</option>
            <option value="japan">🇯🇵 Japan (TSE)</option>
            <option value="germany">🇩🇪 Germany (Xetra)</option>
            <option value="china">🇨🇳 China/HK</option>
            <option value="canada">🇨🇦 Canada (TSX)</option>
            <option value="australia">🇦🇺 Australia (ASX)</option>
            <option value="france">🇫🇷 France</option>
            <option value="singapore">🇸🇬 Singapore</option>
          </select>
        </div>
        <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <div className="badge">Hi, {user.name||user.email}</div>
          <button className="btn" style={{background:'#0ecb81', color:'#111', padding:'6px 12px', fontSize:12, display:'flex', alignItems:'center', gap:6}} onClick={()=>setShowLiveData(true)}><span style={{width:8,height:8,background:'#111',borderRadius:'50%', display:'inline-block', animation:'pulse 1s infinite'}}></span> LIVE DATA</button>
          <button className="btn" style={{background:'#f0b90b', color:'#111', padding:'6px 12px', fontSize:12}} onClick={()=>setShowPortfolio(true)}>📁 Portfolio</button>
          <div className="badge">Cash ${portfolio?.cash?.toLocaleString() ?? '—'}</div>
          <div className="badge" style={{background:(portfolio?.totalPnl??0)>=0?'rgba(14,203,129,0.15)':'rgba(246,70,93,0.15)'}}>P&L <span className={(portfolio?.totalPnl??0)>=0?'price-up':'price-down'}>{portfolio?.totalPnl??0}</span></div>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="ticker" style={{display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', cursor:'default'}}>
        {prices.slice(0,20).map(p=> (
          <span key={p.symbol} onClick={()=>{
            setSelected(p.symbol)
            if(p.assetClass) setCls(p.assetClass)
            // smooth scroll to chart
            document.querySelector('.chart-wrap')?.scrollIntoView({behavior:'smooth', block:'center'})
          }} title={`Click to open ${p.symbol} chart • ${p.assetClass} • ${p.price}`}
            style={{
              cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
              padding:'4px 10px', borderRadius:999, flexShrink:0,
              background: selected===p.symbol ? 'rgba(240,185,11,0.18)' : 'rgba(43,49,57,0.6)',
              border: selected===p.symbol ? '1px solid #f0b90b' : '1px solid transparent',
              transition:'0.15s'
            }} onMouseEnter={e=> e.currentTarget.style.background='rgba(43,49,57,0.9)'} onMouseLeave={e=> e.currentTarget.style.background= selected===p.symbol ? 'rgba(240,185,11,0.18)' : 'rgba(43,49,57,0.6)'}>
            <b style={{fontSize:11}}>{p.symbol}</b> <b className={p.change>=0?'price-up':'price-down'} style={{fontSize:11}}>{p.price}</b> <small style={{opacity:0.6, fontSize:10}}>{p.change>0?'+':''}{p.change}%</small> <span style={{opacity:0.4, fontSize:9}}>{p.assetClass==='stocks'?'📈': p.assetClass==='crypto'?'₿': p.assetClass==='forex'?'💱': p.assetClass==='commodity'?'🥇':'📊'}</span>
          </span>
        ))}
        {prices.length===0 && <span>Connecting...</span>}
        <span style={{marginLeft:'auto', opacity:0.5, fontSize:10, whiteSpace:'nowrap', flexShrink:0, alignSelf:'center', paddingRight:8}}>↔ click any ticker to open chart + info</span>
      </div>

      <div className="layout">
        <div className="panel">
          <div className="panel-h"><span>{cls.toUpperCase()} • WATCHLIST</span><span className="badge">{filtered.length}</span></div>
          <div style={{maxHeight:420, overflowY:'auto'}}>
            {filtered.map(p=> <div key={p.symbol} onClick={()=>setSelected(p.symbol)} className={`watch-item ${selected===p.symbol?'active':''}`}><div><div className="sym">{p.symbol}</div><div style={{fontSize:11,opacity:0.6}}>{p.assetClass}</div></div><div style={{textAlign:'right'}}><div className="price">{p.price}</div><div className={p.change>=0?'price-up':'price-down'} style={{fontSize:11}}>{p.change>0?'+':''}{p.change}%</div></div></div>)}
            {filtered.length===0 && <div style={{padding:16,opacity:0.6}}>Waiting...</div>}
          </div>
          <div className="kpi"><div className="kpi-card"><h4>TOTAL VALUE</h4><b>${portfolio?.totalValue??0}</b></div><div className="kpi-card"><h4>OPEN P&L</h4><b className={(portfolio?.totalPnl??0)>=0?'price-up':'price-down'}>{portfolio?.totalPnl??0}</b></div></div>
        </div>

        <div className="panel" style={{overflow:'hidden'}}>
          <div className="panel-h" style={{flexWrap:'wrap', gap:8}}>
            <div><span className="sym" style={{fontSize:16}}>{selected}</span> <span className={selPrice?.change>=0?'price-up':'price-down'}> {selPrice?.price} ({selPrice?.change>0?'+':''}{selPrice?.change}%)</span></div>
            <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
              {['candle','line','area'].map(t=> <button key={t} onClick={()=>setChartType(t)} className={`tab ${chartType===t?'active':''}`} style={{padding:'6px 10px', fontSize:11}}>{t.toUpperCase()}</button>)}
            </div>
          </div>
          {/* History Range + CAGR Tool */}
          <div style={{display:'flex', gap:6, padding:'8px 12px', flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid #2b3139', background:'#0b0e11'}}>
            <span style={{fontSize:11, opacity:0.6}}>HISTORY:</span>
            {['1d','5d','1mo','3mo','6mo','1y','2y','5y'].map(r=>(
              <button key={r} onClick={()=>setRange(r)} className={`tab ${range===r?'active':''}`} style={{padding:'5px 8px', fontSize:10}}>{r.toUpperCase()}</button>
            ))}
            <span style={{marginLeft:8, fontSize:11, opacity:0.6}}>CAGR:</span>
            <input type="number" value={cagr} onChange={e=>setCagr(e.target.value)} style={{width:60, padding:'5px 6px', fontSize:11, background:'#1e2329', border:'1px solid #2b3139', borderRadius:6, color:'#eaecef'}} placeholder="20" />
            <span style={{fontSize:11}}>%</span>
            <input type="number" value={cagrPeriods} onChange={e=>setCagrPeriods(e.target.value)} style={{width:55, padding:'5px 6px', fontSize:11, background:'#1e2329', border:'1px solid #2b3139', borderRadius:6, color:'#eaecef'}} placeholder="90" />
            <span style={{fontSize:10, opacity:0.6}}>days</span>
            <label style={{display:'flex', gap:4, alignItems:'center', background: showCagr?'#f0b90b':'#2b3139', color: showCagr?'#111':'#eaecef', padding:'4px 8px', borderRadius:999, fontSize:11, cursor:'pointer', fontWeight:600}}>
              <input type="checkbox" checked={showCagr} onChange={e=>setShowCagr(e.target.checked)} style={{accentColor:'#f0b90b'}} /> {showCagr?'✓ PROJ':'SHOW'}
            </label>
            {showCagr && enriched.length>0 && <span style={{fontSize:10, opacity:0.6}}>→ {cagrLine[0]?.value} → {cagrLine[cagrLine.length-1]?.value?.toFixed(2)} {Number(cagr)>=0?'↗':'↘'}</span>}
          </div>
          {/* Indicator toggles */}
          <div style={{display:'flex', gap:6, padding:'8px 12px', flexWrap:'wrap', borderBottom:'1px solid #2b3139', background:'#181a20'}}>
            <span style={{fontSize:11, opacity:0.6, alignSelf:'center'}}>INDICATORS:</span>
            {[
              ['sma20','SMA20'],['sma50','SMA50'],['ema20','EMA20'],['bb','BB'],['volume','VOL'],['rsi','RSI'],['macd','MACD']
            ].map(([k,label])=>(
              <label key={k} style={{display:'flex', gap:4, alignItems:'center', background: ind[k]?'#f0b90b':'#2b3139', color: ind[k]?'#111':'#eaecef', padding:'4px 8px', borderRadius:999, fontSize:11, cursor:'pointer', fontWeight:600}}>
                <input type="checkbox" checked={ind[k]} onChange={e=>setInd({...ind, [k]:e.target.checked})} style={{accentColor:'#f0b90b'}} /> {label}
              </label>
            ))}
          </div>

          {/* Main Chart - TradingView style */}
          <div style={{height:360, background:'#0b0e11', borderBottom:'1px solid #2b3139'}}>
            {chartType==='candle' ? (
              <TradingViewChart data={enriched} symbol={selected} showVolume={false} sma20Data={ind.sma20} sma50Data={ind.sma50} ema20Data={ind.ema20} cagrLine={showCagr?cagrLine:null} />
            ) : (
              <div style={{height:360, padding:8}}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={showCagr ? [...enriched, ...cagrLine.map(p=>({time:p.time, cagr:p.value}))] : enriched} margin={{top:10, right:10, left:0, bottom:0}}>
                    <CartesianGrid stroke="rgba(43,49,57,0.5)" strokeDasharray="3 3" />
                    <XAxis dataKey="time" hide /><YAxis domain={['dataMin-2','dataMax+2']} tick={{fontSize:10, fill:'#848e9c'}} width={50} />
                    <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:12, fontSize:12}} formatter={(v,n)=>[v,n]} labelFormatter={()=>selected} />
                    {chartType==='line' && <Line type="monotone" dataKey="close" stroke="#f0b90b" dot={false} strokeWidth={2} />}
                    {chartType==='area' && <Area type="monotone" dataKey="close" stroke="#f0b90b" fill="rgba(240,185,11,0.18)" strokeWidth={2} />}
                    {ind.sma20 && <Line type="monotone" dataKey="sma20" stroke="#00bfff" dot={false} strokeWidth={1.5} />}
                    {ind.sma50 && <Line type="monotone" dataKey="sma50" stroke="#ff8c00" dot={false} strokeWidth={1.5} />}
                    {ind.ema20 && <Line type="monotone" dataKey="ema20" stroke="#a78bfa" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />}
                    {ind.bb && <><Line type="monotone" dataKey="bbUpper" stroke="rgba(132,142,156,0.7)" dot={false} strokeWidth={1} strokeDasharray="3 3" /><Line type="monotone" dataKey="bbLower" stroke="rgba(132,142,156,0.7)" dot={false} strokeWidth={1} strokeDasharray="3 3" /><Line type="monotone" dataKey="bbMid" stroke="rgba(132,142,156,0.5)" dot={false} strokeWidth={1} /></>}
                    {showCagr && <Line type="monotone" dataKey="cagr" stroke="#f0b90b" dot={false} strokeWidth={2} strokeDasharray="6 4" />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Volume */}
          {ind.volume && (
            <div style={{height:90, padding:'0 8px 8px 8px', background:'#0b0e11', borderTop:'1px solid #2b3139'}}>
              <div style={{fontSize:10, opacity:0.6, padding:'4px'}}>VOLUME</div>
              <ResponsiveContainer width="100%" height={70}>
                <ComposedChart data={enriched}>
                  <XAxis dataKey="time" hide /><YAxis hide domain={[0,'dataMax']} />
                  <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:8}} />
                  <Bar dataKey="volume" barSize={4}>{enriched.map((e,i)=><Cell key={i} fill={e.isUp?'rgba(14,203,129,0.6)':'rgba(246,70,93,0.6)'} />)}</Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* RSI */}
          {ind.rsi && (
            <div style={{height:110, padding:'0 8px 8px 8px', background:'#0b0e11', borderTop:'1px solid #2b3139'}}>
              <div style={{fontSize:10, opacity:0.6, padding:'4px'}}>RSI (14) • 70 overbought / 30 oversold • {enriched[enriched.length-1]?.rsi ?? 50}</div>
              <ResponsiveContainer width="100%" height={80}>
                <ComposedChart data={enriched}>
                  <YAxis domain={[0,100]} tick={{fontSize:10, fill:'#848e9c'}} width={30} /><XAxis dataKey="time" hide />
                  <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:8}} />
                  <Line type="monotone" dataKey="rsi" stroke="#f0b90b" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey={()=>70} stroke="rgba(246,70,93,0.5)" dot={false} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey={()=>30} stroke="rgba(14,203,129,0.5)" dot={false} strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* MACD */}
          {ind.macd && (
            <div style={{height:110, padding:'0 8px 8px 8px', background:'#0b0e11', borderTop:'1px solid #2b3139'}}>
              <div style={{fontSize:10, opacity:0.6, padding:'4px'}}>MACD (12,26,9) • Hist</div>
              <ResponsiveContainer width="100%" height={80}>
                <ComposedChart data={enriched}>
                  <YAxis tick={{fontSize:10, fill:'#848e9c'}} width={30} /><XAxis dataKey="time" hide />
                  <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:8}} />
                  <Bar dataKey="macdHist" barSize={3}>{enriched.map((e,i)=><Cell key={i} fill={e.macdHist>=0?'#0ecb81':'#f6465d'} />)}</Bar>
                  <Line type="monotone" dataKey="macd" stroke="#00bfff" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="macdSignal" stroke="#ff8c00" dot={false} strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid-cards">
            {filtered.slice(0,6).map(p=>(
              <div key={p.symbol} className="panel" style={{padding:10, borderRadius:12, cursor:'pointer'}} onClick={()=>setSelected(p.symbol)}>
                <div className="sym" style={{fontSize:12}}>{p.symbol}</div>
                <div className="price" style={{fontSize:14}}>${p.price}</div>
                <div className={p.change>=0?'price-up':'price-down'} style={{fontSize:11}}>{p.change>0?'▲':'▼'} {Math.abs(p.change)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'grid', gap:12}}>
          <div className="panel"><div className="panel-h"><span>ORDER TICKET</span><span className="badge">{selected}</span></div>
            <div className="order-form">
              <div className="segment"><button className={orderType==='MARKET'?'active':''} onClick={()=>setOrderType('MARKET')}>MARKET</button><button className={orderType==='LIMIT'?'active':''} onClick={()=>setOrderType('LIMIT')}>LIMIT</button></div>
              <label style={{fontSize:12,opacity:0.7}}>Quantity</label><input className="input" type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(e.target.value)} />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}><button className="btn btn-buy" onClick={()=>placeOrder('BUY')}>BUY / LONG</button><button className="btn btn-sell" onClick={()=>placeOrder('SELL')}>SELL / SHORT</button></div>
              <div style={{fontSize:11, opacity:0.6}}>Est. Value: ~${selPrice? (Number(qty)*selPrice.price).toFixed(2):0} • Fee 0.1%</div>
            </div>
          </div>
          <div className="panel"><div className="panel-h"><span>PORTFOLIO</span><div style={{display:'flex', gap:6}}><button className="btn" style={{background:'#f0b90b', color:'#111', padding:'4px 8px', fontSize:11}} onClick={()=>setShowPortfolio(true)}>View Full →</button><button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:11}} onClick={async()=>{const {data}=await axios.get(`${API}/api/portfolio`); setPortfolio(data)}}>↻</button></div></div>
            <div style={{maxHeight:180, overflow:'auto'}}><table className="table"><thead><tr><th>SYMBOL</th><th>QTY</th><th>VALUE</th><th>P&L%</th></tr></thead><tbody>{portfolio?.positions?.slice(0,5).map(pos=>(<tr key={pos.symbol}><td><b>{pos.symbol}</b> <span style={{opacity:0.5, fontSize:10}}>{pos.assetClass}</span></td><td>{pos.qty}</td><td>${pos.currentValue?.toLocaleString()}</td><td className={pos.pnlPct>=0?'price-up':'price-down'}>{pos.pnlPct>0?'+':''}{pos.pnlPct}%</td></tr>))} {!portfolio?.positions?.length && <tr><td colSpan="4" style={{opacity:0.6, padding:12}}>No positions</td></tr>}</tbody></table><div style={{padding:'6px 10px', fontSize:11, opacity:0.6, borderTop:'1px solid #2b3139'}}>Total: ${portfolio?.totalValue?.toLocaleString()} • Invested ${portfolio?.totalInvested?.toLocaleString()} • <span className={(portfolio?.totalPnl??0)>=0?'price-up':'price-down'}>{portfolio?.totalPnlPct}%</span> • Cash ${portfolio?.cash?.toLocaleString()}</div></div>
          </div>
          <div className="panel"><div className="panel-h"><span>ORDERS</span><span className="badge">{orders.length}</span></div>
            <div style={{maxHeight:180, overflow:'auto'}}><table className="table"><thead><tr><th>ID</th><th>SIDE</th><th>QTY</th><th>STATUS</th></tr></thead><tbody>{orders.slice(0,8).map(o=>(<tr key={o.id}><td>#{o.id}</td><td className={o.side==='BUY'?'price-up':'price-down'}>{o.side}</td><td>{o.symbol} x{o.qty}</td><td>{o.status}</td></tr>))} {orders.length===0 && <tr><td colSpan="4" style={{opacity:0.6, padding:12}}>No orders yet</td></tr>}</tbody></table></div>
          </div>
        </div>
      </div>
      {showPortfolio && <Portfolio onClose={()=>setShowPortfolio(false)} />}
      {showLiveData && <LiveData onClose={()=>setShowLiveData(false)} onSelect={(sym, assetClass)=>{ setSelected(sym); if(assetClass) setCls(assetClass); }} />}
    </div>
  )
}

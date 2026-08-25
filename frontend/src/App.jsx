import React, { useEffect, useState, useMemo } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CLASSES = [
  { id:'stocks', label:'STOCKS', icon:'📈' },
  { id:'crypto', label:'CRYPTO', icon:'₿' },
  { id:'forex', label:'FOREX', icon:'💱' },
  { id:'commodity', label:'COMMODITY', icon:'🥇' },
  { id:'index', label:'INDEX', icon:'📊' },
]

export default function App(){
  const [prices, setPrices] = useState([])
  const [cls, setCls] = useState('crypto')
  const [selected, setSelected] = useState('BTC-USD')
  const [orders, setOrders] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [candles, setCandles] = useState([])

  // live prices: websocket + fallback polling for Vercel serverless
  useEffect(()=>{
    let socket
    try {
      socket = io(API, { transports:['websocket','polling'] })
      socket.on('price:update', d => setPrices(d))
      socket.on('connect_error', ()=>{})
    } catch {}
    const poll = setInterval(async()=>{
      try{ const {data}=await axios.get(`${API}/api/market/prices`); if(data.length) setPrices(data)}catch{}
    }, 3000)
    return ()=>{ try{socket?.disconnect()}catch{}; clearInterval(poll)}
  },[])

  useEffect(()=>{
    axios.get(`${API}/api/portfolio`).then(r=>setPortfolio(r.data)).catch(()=>{})
    axios.get(`${API}/api/orders`).then(r=>setOrders(r.data)).catch(()=>{})
  },[])

  useEffect(()=>{
    axios.get(`${API}/api/market/candle/${selected}`).then(r=>setCandles(r.data.candles||[])).catch(()=>setCandles([]))
  },[selected])

  const filtered = useMemo(()=> prices.filter(p=>p.assetClass===cls), [prices, cls])
  const selPrice = useMemo(()=> prices.find(p=>p.symbol===selected), [prices, selected])

  // auto-select first symbol of class
  useEffect(()=>{ if(filtered.length && !filtered.find(f=>f.symbol===selected)) setSelected(filtered[0].symbol)},[filtered])

  const placeOrder = async (side)=>{
    if(!qty || qty<=0) return alert('Enter valid qty')
    try{
      await axios.post(`${API}/api/orders`, { symbol:selected, assetClass:cls, side, qty:Number(qty), type:orderType })
      const {data}=await axios.get(`${API}/api/orders`); setOrders(data)
      const {data:pf}=await axios.get(`${API}/api/portfolio`); setPortfolio(pf)
    }catch(e){ alert(e?.response?.data?.error || e.message)}
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo"> <span style={{background:'#f0b90b', color:'#111', padding:'4px 8px', borderRadius:8, fontSize:12}}>◼</span> TRADING<span>TERMINAL</span> <span className="badge">PRO • 5 ASSETS</span></div>
        <div className="tabs">
          {CLASSES.map(c=> <button key={c.id} onClick={()=>setCls(c.id)} className={`tab ${cls===c.id?'active':''}`}>{c.icon} {c.label}</button>)}
        </div>
        <div style={{marginLeft:'auto', display:'flex', gap:10, alignItems:'center'}}>
          <div className="badge">Cash ${portfolio?.cash?.toLocaleString() ?? '—'}</div>
          <div className="badge" style={{background: (portfolio?.totalPnl??0)>=0?'rgba(14,203,129,0.15)':'rgba(246,70,93,0.15)', borderColor:(portfolio?.totalPnl??0)>=0?'#0ecb81':'#f6465d'}}>
            P&L <span className={(portfolio?.totalPnl??0)>=0?'price-up':'price-down'}>{portfolio?.totalPnl ?? 0}</span>
          </div>
          <button className="btn btn-ghost" onClick={()=>window.open('https://github.com/yogishwaraudupa/TradingPlatform','_blank')}>GitHub</button>
        </div>
      </div>

      {/* Ticker */}
      <div className="ticker">
        {prices.slice(0,12).map(p=> (
          <span key={p.symbol}>{p.symbol} <b className={p.change>=0?'price-up':'price-down'}>{p.price}</b> <small style={{opacity:0.6}}>{p.change>0?'+':''}{p.change}%</small></span>
        ))}
        {prices.length===0 && <span>Connecting to live feed...</span>}
      </div>

      <div className="layout">
        {/* Left - Watchlist */}
        <div className="panel">
          <div className="panel-h"><span>{cls.toUpperCase()} • WATCHLIST</span><span className="badge">{filtered.length}</span></div>
          <div style={{maxHeight:420, overflowY:'auto'}}>
            {filtered.map(p=> (
              <div key={p.symbol} onClick={()=>setSelected(p.symbol)} className={`watch-item ${selected===p.symbol?'active':''}`}>
                <div><div className="sym">{p.symbol}</div><div style={{fontSize:11,opacity:0.6}}>{p.assetClass}</div></div>
                <div style={{textAlign:'right'}}><div className="price">{p.price}</div><div className={p.change>=0?'price-up':'price-down'} style={{fontSize:11}}>{p.change>0?'+':''}{p.change}%</div></div>
              </div>
            ))}
            {filtered.length===0 && <div style={{padding:16,opacity:0.6}}>Waiting for price feed...</div>}
          </div>
          <div className="kpi">
            <div className="kpi-card"><h4>TOTAL VALUE</h4><b>${portfolio?.totalValue ?? 0}</b></div>
            <div className="kpi-card"><h4>OPEN P&L</h4><b className={(portfolio?.totalPnl??0)>=0?'price-up':'price-down'}>{portfolio?.totalPnl ?? 0}</b></div>
          </div>
        </div>

        {/* Center - Chart + Grid */}
        <div className="panel">
          <div className="panel-h">
            <div><span className="sym" style={{fontSize:16}}>{selected}</span> <span className={selPrice?.change>=0?'price-up':'price-down'}> {selPrice?.price} ({selPrice?.change>0?'+':''}{selPrice?.change}%)</span></div>
            <div className="badge">1M • LIVE</div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={candles}>
                <XAxis dataKey="time" hide /><YAxis domain={['dataMin-2','dataMax+2']} hide />
                <Tooltip contentStyle={{background:'#181a20',border:'1px solid #2b3139', borderRadius:12}} formatter={(v)=>[v, 'Close']} labelFormatter={()=>selected} />
                <Area type="monotone" dataKey="close" stroke="#f0b90b" fill="rgba(240,185,11,0.15)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid-cards">
            {filtered.slice(0,6).map(p=>(
              <div key={p.symbol} className="panel" style={{padding:10, borderRadius:12}} onClick={()=>setSelected(p.symbol)}>
                <div className="sym" style={{fontSize:12}}>{p.symbol}</div>
                <div className="price" style={{fontSize:14}}>${p.price}</div>
                <div className={p.change>=0?'price-up':'price-down'} style={{fontSize:11}}>{p.change>0?'▲':'▼'} {Math.abs(p.change)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Order Ticket + Portfolio */}
        <div style={{display:'grid', gap:12}}>
          <div className="panel">
            <div className="panel-h"><span>ORDER TICKET</span><span className="badge">{selected}</span></div>
            <div className="order-form">
              <div className="segment">
                <button className={orderType==='MARKET'?'active':''} onClick={()=>setOrderType('MARKET')}>MARKET</button>
                <button className={orderType==='LIMIT'?'active':''} onClick={()=>setOrderType('LIMIT')}>LIMIT</button>
              </div>
              <label style={{fontSize:12,opacity:0.7}}>Quantity</label>
              <input className="input" type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(e.target.value)} />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <button className="btn btn-buy" onClick={()=>placeOrder('BUY')}>BUY / LONG</button>
                <button className="btn btn-sell" onClick={()=>placeOrder('SELL')}>SELL / SHORT</button>
              </div>
              <div style={{fontSize:11, opacity:0.6}}>Est. Value: ~${selPrice? (Number(qty)*selPrice.price).toFixed(2):0} • Fee 0.1%</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h"><span>PORTFOLIO</span><button className="btn btn-ghost" style={{padding:'4px 8px', fontSize:11}} onClick={async()=>{const {data}=await axios.get(`${API}/api/portfolio`); setPortfolio(data)}}>↻ Refresh</button></div>
            <div style={{maxHeight:180, overflow:'auto'}}>
              <table className="table">
                <thead><tr><th>SYMBOL</th><th>QTY</th><th>P&L</th></tr></thead>
                <tbody>
                  {portfolio?.positions?.map(pos=>(
                    <tr key={pos.symbol}><td>{pos.symbol}</td><td>{pos.qty}</td><td className={pos.pnl>=0?'price-up':'price-down'}>{pos.pnl>0?'+':''}{pos.pnl}</td></tr>
                  ))}
                  {!portfolio?.positions?.length && <tr><td colSpan="3" style={{opacity:0.6, padding:12}}>No positions</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h"><span>ORDERS</span><span className="badge">{orders.length}</span></div>
            <div style={{maxHeight:180, overflow:'auto'}}>
              <table className="table">
                <thead><tr><th>ID</th><th>SIDE</th><th>QTY</th><th>STATUS</th></tr></thead>
                <tbody>
                  {orders.slice(0,8).map(o=>(
                    <tr key={o.id}><td>#{o.id}</td><td className={o.side==='BUY'?'price-up':'price-down'}>{o.side}</td><td>{o.symbol} x{o.qty}</td><td>{o.status}</td></tr>
                  ))}
                  {orders.length===0 && <tr><td colSpan="4" style={{opacity:0.6, padding:12}}>No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

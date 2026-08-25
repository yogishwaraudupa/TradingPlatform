import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CLASSES = ['stocks','crypto','forex','commodity','index']

export default function App(){
  const [prices, setPrices] = useState([])
  const [cls, setCls] = useState('stocks')
  const [orders, setOrders] = useState([])
  const [portfolio, setPortfolio] = useState(null)

  useEffect(()=>{
    const socket = io(API)
    socket.on('price:update', data => setPrices(data))
    socket.emit('subscribe', ['*'])
    return ()=> socket.disconnect()
  },[])

  const filtered = prices.filter(p=>p.assetClass===cls)

  const placeOrder = async (symbol, side) => {
    const qty = prompt(`Qty for ${symbol} ${side}?`, '1')
    if(!qty) return
    await axios.post(`${API}/api/orders`, { symbol, assetClass: cls, side, qty: Number(qty), type: 'MARKET' })
    const { data } = await axios.get(`${API}/api/orders`)
    setOrders(data)
  }

  useEffect(()=>{
    axios.get(`${API}/api/portfolio`).then(r=>setPortfolio(r.data)).catch(()=>{})
    axios.get(`${API}/api/orders`).then(r=>setOrders(r.data)).catch(()=>{})
  },[])

  return (
    <div>
      <div className="nav">
        <h3 style={{margin:0}}>Trading Terminal</h3>
        {CLASSES.map(c=> <button key={c} className="btn" style={{background: cls===c?'#f0b90b':'#2b3139', color: cls===c?'#000':'#fff'}} onClick={()=>setCls(c)}>{c.toUpperCase()}</button>)}
        <span style={{marginLeft:'auto'}}>Cash: ${portfolio?.cash} | P&L: <span className={portfolio?.totalPnl>=0?'price-up':'price-down'}>{portfolio?.totalPnl}</span></span>
      </div>

      <div style={{padding:16}}>
        <h3>{cls.toUpperCase()} - Live Prices (WebSocket 2s)</h3>
        <div className="grid">
          {filtered.map(p=>(
            <div key={p.symbol} className="card">
              <b>{p.symbol}</b> <span style={{float:'right'}} className={p.change>=0?'price-up':'price-down'}>{p.change>0?'+':''}{p.change}%</span>
              <h2>${p.price}</h2>
              <button className="btn" onClick={()=>placeOrder(p.symbol,'BUY')}>BUY</button>
              <button className="btn" style={{background:'#f6465d', color:'#fff', marginLeft:8}} onClick={()=>placeOrder(p.symbol,'SELL')}>SELL</button>
            </div>
          ))}
          {filtered.length===0 && <p>Waiting for price feed...</p>}
        </div>

        <h3>Portfolio</h3>
        <div className="card">
          {portfolio ? portfolio.positions.map(pos=>(
            <div key={pos.symbol} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #2b3139', padding:'8px 0'}}>
              <span>{pos.symbol} x {pos.qty} @ {pos.avgPrice}</span>
              <span>LTP {pos.ltp} | <span className={pos.pnl>=0?'price-up':'price-down'}>P&L {pos.pnl}</span></span>
            </div>
          )) : 'Loading...'}
        </div>

        <h3>Orders</h3>
        <div className="card">
          {orders.slice(0,10).map(o=> <div key={o.id}>{o.id} | {o.symbol} | {o.side} {o.qty} | {o.status} | {o.createdAt}</div>)}
          {orders.length===0 && 'No orders yet'}
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const COLORS = ['#f0b90b','#0ecb81','#00bfff','#ff8c00','#a78bfa','#f6465d','#848e9c']

export default function Portfolio({ onClose }){
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [addSymbol, setAddSymbol] = useState('AAPL')
  const [addQty, setAddQty] = useState(5)

  const refresh = async()=>{
    const {data:pf}=await axios.get(`${API}/api/portfolio`)
    setData(pf)
    const {data:h}=await axios.get(`${API}/api/portfolio/history`)
    setHistory(h)
  }
  useEffect(()=>{ refresh() },[])

  const handleAdd = async()=>{
    await axios.post(`${API}/api/portfolio/add`, { symbol: addSymbol, qty: Number(addQty) })
    refresh()
  }

  if(!data) return <div style={{padding:20}}>Loading portfolio...</div>

  const pieData = data.positions.map(p=>({ name:p.symbol, value:p.currentValue }))

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', zIndex:50, overflow:'auto', padding:12}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:1100, margin:'10px auto', background:'#1e2329', border:'1px solid #2b3139', borderRadius:16, overflow:'hidden', maxHeight:'96vh', display:'flex', flexDirection:'column'}}>
        <div style={{padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2b3139', flexShrink:0, flexWrap:'wrap', gap:8}}>
          <h2 style={{margin:0, fontSize:15, lineHeight:1.2}}>📁 Portfolio • {data.positions.length} holdings • Net Worth ${data.netWorth?.toLocaleString()}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{flexShrink:0}}>✕ Close</button>
        </div>
        <div style={{overflow:'auto', flex:1}}>

        {/* KPI Cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, padding:12}}>
          <div className="kpi-card"><h4>INVESTED</h4><b>${data.totalInvested.toLocaleString()}</b><div style={{fontSize:11,opacity:0.6}}>Cost basis</div></div>
          <div className="kpi-card"><h4>CURRENT VALUE</h4><b>${data.totalValue.toLocaleString()}</b><div style={{fontSize:11,opacity:0.6}}>Holdings value</div></div>
          <div className="kpi-card" style={{borderColor: data.totalPnl>=0?'#0ecb81':'#f6465d'}}><h4>TOTAL P&L</h4><b className={data.totalPnl>=0?'price-up':'price-down'}>{data.totalPnl>0?'+':''}${data.totalPnl.toLocaleString()} ({data.totalPnlPct}%)</b><div style={{fontSize:11,opacity:0.6}}>All time</div></div>
          <div className="kpi-card"><h4>DAY P&L</h4><b className={data.totalDayPnl>=0?'price-up':'price-down'}>{data.totalDayPnl>0?'+':''}${data.totalDayPnl.toFixed(2)}</b><div style={{fontSize:11,opacity:0.6}}>Today</div></div>
          <div className="kpi-card"><h4>CASH</h4><b>${data.cash.toLocaleString()}</b><div style={{fontSize:11,opacity:0.6}}>Available</div></div>
          <div className="kpi-card"><h4>NET WORTH</h4><b>${data.netWorth.toLocaleString()}</b><div style={{fontSize:11,opacity:0.6}}>Cash + Holdings</div></div>
        </div>

        <div className="portfolio-grid">
          <div className="panel" style={{minWidth:0}}>
            <div className="panel-h">ALLOCATION</div>
            <div style={{height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:8}} />
                  <Legend wrapperStyle={{fontSize:11}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel" style={{minWidth:0}}>
            <div className="panel-h">PERFORMANCE (30D)</div>
            <div style={{height:220, padding:8}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <XAxis dataKey="date" hide /><YAxis tick={{fontSize:10, fill:'#848e9c'}} width={55} domain={['dataMin-500','dataMax+500']} />
                  <Tooltip contentStyle={{background:'#181a20', border:'1px solid #2b3139', borderRadius:8}} />
                  <Area type="monotone" dataKey="value" stroke="#f0b90b" fill="rgba(240,185,11,0.15)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div style={{padding:12}}>
          <div className="panel" style={{minWidth:0}}>
            <div className="panel-h" style={{flexWrap:'wrap', gap:8}}><span>HOLDINGS • {data.positions.length}</span><div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}><input className="input" style={{width:110, padding:'6px 8px', fontSize:12}} value={addSymbol} onChange={e=>setAddSymbol(e.target.value.toUpperCase())} placeholder="SYMBOL" /><input className="input" style={{width:70, padding:'6px 8px', fontSize:12}} type="number" value={addQty} onChange={e=>setAddQty(e.target.value)} /><button className="btn" style={{background:'#f0b90b', color:'#111', padding:'6px 10px', fontSize:12}} onClick={handleAdd}>+ Add</button></div></div>
            <div style={{overflow:'auto'}}>
              <table className="table" style={{minWidth:860}}>
                <thead><tr><th>SYMBOL</th><th>CLASS</th><th>QTY</th><th>AVG</th><th>LTP</th><th>INVESTED</th><th>CUR VALUE</th><th>P&L</th><th>P&L%</th><th>ALLOC</th><th>DAY</th></tr></thead>
                <tbody>
                  {data.positions.map(p=>(
                    <tr key={p.symbol}>
                      <td><b>{p.symbol}</b></td>
                      <td><span className="badge" style={{fontSize:10}}>{p.assetClass}</span></td>
                      <td>{p.qty}</td>
                      <td>{p.avgPrice}</td>
                      <td>{p.ltp}</td>
                      <td>${p.invested.toLocaleString()}</td>
                      <td>${p.currentValue.toLocaleString()}</td>
                      <td className={p.pnl>=0?'price-up':'price-down'}>{p.pnl>0?'+':''}{p.pnl.toLocaleString()}</td>
                      <td className={p.pnlPct>=0?'price-up':'price-down'}>{p.pnlPct>0?'+':''}{p.pnlPct}%</td>
                      <td>{p.allocation}%</td>
                      <td className={p.dayChange>=0?'price-up':'price-down'}>{p.dayChange>0?'+':''}{p.dayChange}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

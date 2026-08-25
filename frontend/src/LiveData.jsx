import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const CATEGORIES = [
  { id:'all', label:'ALL', icon:'🌍' },
  { id:'us_stocks', label:'US STOCKS', icon:'🇺🇸' },
  { id:'india_stocks', label:'INDIA STOCKS', icon:'🇮🇳' },
  { id:'india_indices', label:'INDIA INDICES', icon:'📊🇮🇳' },
  { id:'us_indices', label:'US INDICES', icon:'📊🇺🇸' },
  { id:'commodity', label:'COMMODITY', icon:'🥇' },
  { id:'crypto', label:'CRYPTO', icon:'₿' },
  { id:'forex', label:'FOREX', icon:'💱' },
]

export default function LiveData({ onClose, onSelect }){
  const [data, setData] = useState([])
  const [filter, setFilter] = useState('all')
  const [lastTick, setLastTick] = useState(new Date().toLocaleTimeString())

  const fetchData = async()=>{
    try{
      if(filter==='all'){
        const { data:prices } = await axios.get(`${API}/api/market/prices`)
        setData(prices)
      } else {
        const { data:prices } = await axios.get(`${API}/api/market/category/${filter}`)
        setData(prices)
      }
      setLastTick(new Date().toLocaleTimeString())
    }catch{
      try{
        const { data:prices } = await axios.get(`${API}/api/market/prices`)
        setData(prices)
      }catch{}
    }
  }

  useEffect(()=>{
    fetchData()
    const id = setInterval(fetchData, 3000)
    return ()=>clearInterval(id)
  },[filter])

  const stats = {
    total: data.length,
    real: data.filter(d=>d.source==='real').length,
    up: data.filter(d=>d.change>0).length,
    down: data.filter(d=>d.change<0).length,
  }

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', zIndex:60, overflow:'auto', padding:12}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:1200, margin:'10px auto', background:'#1e2329', border:'1px solid #2b3139', borderRadius:16, overflow:'hidden'}}>
        <div style={{padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2b3139', flexWrap:'wrap', gap:8}}>
          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <span style={{width:10, height:10, background:'#0ecb81', borderRadius:'50%', display:'inline-block', boxShadow:'0 0 8px #0ecb81', animation:'pulse 1.5s infinite'}}></span>
            <h2 style={{margin:0, fontSize:15}}>🔴 LIVE CONCURRENT DATA</h2>
            <span className="badge" style={{background:'rgba(14,203,129,0.15)', borderColor:'#0ecb81'}}>REAL {stats.real}/{stats.total}</span>
            <span className="badge">UP {stats.up} • DOWN {stats.down}</span>
            <span style={{fontSize:11, opacity:0.6}}>Last tick: {lastTick} • Auto 3s • {data.length} symbols</span>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{display:'flex', gap:6, padding:'10px 12px', flexWrap:'wrap', background:'#0b0e11', borderBottom:'1px solid #2b3139'}}>
          {CATEGORIES.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className={`tab ${filter===f.id?'active':''}`} style={{padding:'6px 10px', fontSize:11}}>{f.icon} {f.label}</button>
          ))}
          <span style={{marginLeft:'auto', fontSize:11, opacity:0.6, alignSelf:'center'}}>Category-wise • Click row → chart</span>
        </div>

        <div style={{overflow:'auto', maxHeight:'65vh'}}>
          <table className="table" style={{minWidth:950}}>
            <thead style={{position:'sticky', top:0, background:'#1e2329', zIndex:1}}>
              <tr><th>#</th><th>SYMBOL</th><th>CATEGORY</th><th>PRICE</th><th>CHANGE</th><th>%</th><th>PREV CLOSE</th><th>SOURCE</th><th>LAST UPDATE</th><th>ACTION</th></tr>
            </thead>
            <tbody>
              {data.map((d,i)=>(
                <tr key={d.symbol} style={{cursor:'pointer'}} onClick={()=>{ onSelect && onSelect(d.symbol, d.assetClass||'stocks'); onClose() }}>
                  <td style={{opacity:0.5}}>{i+1}</td>
                  <td><b>{d.symbol}</b></td>
                  <td><span className="badge" style={{fontSize:10, background: (d.assetClass||'stocks')==='crypto'?'rgba(167,139,250,0.15)': (d.assetClass||'stocks')==='index'?'rgba(0,191,255,0.15)': (d.assetClass||'stocks')==='commodity'?'rgba(255,140,0,0.15)':'#2b3139'}}>{String(d.assetClass||'stocks').toUpperCase()}</span></td>
                  <td className="price">${d.price}</td>
                  <td className={d.change>=0?'price-up':'price-down'}>{d.change>0?'+':''}{d.change}</td>
                  <td className={d.change>=0?'price-up':'price-down'}>{d.change>0?'+':''}{Number(d.change||0).toFixed(2)}%</td>
                  <td style={{opacity:0.7}}>{d.prevClose ?? '—'}</td>
                  <td><span className="badge" style={{background: d.source==='real'?'rgba(14,203,129,0.15)':'rgba(132,142,156,0.2)', borderColor: d.source==='real'?'#0ecb81':'#2b3139', fontSize:10}}>{d.source==='real'?'● LIVE':'○ MOCK'}</span></td>
                  <td style={{fontSize:10, opacity:0.6}}>{d.lastUpdate ? new Date(d.lastUpdate).toLocaleTimeString() : '—'}</td>
                  <td><button className="btn" style={{background:'#f0b90b', color:'#111', padding:'4px 8px', fontSize:10}} onClick={(e)=>{ e.stopPropagation(); onSelect && onSelect(d.symbol, d.assetClass||'stocks'); onClose() }}>Open Chart ↗</button></td>
                </tr>
              ))}
              {data.length===0 && <tr><td colSpan={10} style={{textAlign:'center', padding:20, opacity:0.6}}>No data for {filter} — try ALL</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{padding:'8px 12px', fontSize:11, opacity:0.6, borderTop:'1px solid #2b3139', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
          <span>60+ symbols • US Stocks 10 • India Stocks 10 • India Indices 4 • US Indices 4 • Global • Commodity 5 • Crypto 7 • Forex 6 • Yahoo + CoinGecko live</span>
          <span>Tip: Use search + country filter for more</span>
        </div>
      </div>
      <style>{`@keyframes pulse{0%{opacity:1; transform:scale(1)}50%{opacity:0.6; transform:scale(1.2)}100%{opacity:1; transform:scale(1)}}`}</style>
    </div>
  )
}

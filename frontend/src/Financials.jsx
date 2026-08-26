import React, { useEffect, useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Financials({ symbol, onClose }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    setLoading(true)
    axios.get(`${API}/api/market/financials/${encodeURIComponent(symbol)}`)
      .then(r=>{ setData(r.data); setLoading(false) })
      .catch(e=>{ setError(e.message); setLoading(false) })
  },[symbol])

  if(loading) return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:70, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#1e2329', padding:24, borderRadius:12, border:'1px solid #2b3139'}}>Loading financial report for {symbol}...</div>
    </div>
  )

  const price = data?.price?.regularMarketPrice?.raw ?? data?.price?.regularMarketPrice ?? '—'
  const currency = data?.price?.currency || 'USD'
  const profile = data?.assetProfile || {}
  const fin = data?.financialData || {}
  const stats = data?.defaultKeyStatistics || {}
  const income = data?.incomeStatementHistory?.incomeStatementHistory || []
  const balance = data?.balanceSheetHistory?.balanceSheetStatements || []
  const earnings = data?.earnings?.financialsChart?.yearly || []

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', zIndex:70, overflow:'auto', padding:12}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:1100, margin:'10px auto', background:'#1e2329', border:'1px solid #2b3139', borderRadius:16, overflow:'hidden'}}>
        <div style={{padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2b3139', flexWrap:'wrap', gap:8, background:'#181a20'}}>
          <div>
            <h2 style={{margin:0, fontSize:15}}>📄 Financial Report • {symbol} {data?.yahooSymbol && <span style={{opacity:0.5, fontSize:12}}>({data.yahooSymbol})</span>} <span className="badge" style={{background: data?.source==='yahoo'?'rgba(14,203,129,0.15)':'#2b3139', borderColor: data?.source==='yahoo'?'#0ecb81':'#2b3139'}}>{data?.source==='yahoo'?'● LIVE internet':'○ MOCK'}</span></h2>
            <div style={{fontSize:11, opacity:0.6}}>{profile.sector ? `${profile.sector} • ${profile.industry}` : ''} {profile.country? `• ${profile.country}`:''} {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{color:'#f0b90b', marginLeft:6}}>{profile.website}</a>}</div>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div className="badge" style={{fontSize:12, padding:'6px 10px'}}>Price {price} {currency}</div>
            <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        <div style={{padding:12, display:'grid', gap:12}}>
          {/* Profile */}
          {profile.longBusinessSummary && (
            <div className="panel" style={{padding:12}}>
              <h3 style={{margin:'0 0 8px 0', fontSize:13}}>Company Profile</h3>
              <p style={{fontSize:11, opacity:0.8, lineHeight:1.6, margin:0}}>{profile.longBusinessSummary.slice(0,600)}{profile.longBusinessSummary.length>600?'...':''}</p>
              <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
                {profile.sector && <span className="badge">{profile.sector}</span>}
                {profile.industry && <span className="badge">{profile.industry}</span>}
                {profile.fullTimeEmployees && <span className="badge">{profile.fullTimeEmployees.toLocaleString()} employees</span>}
              </div>
            </div>
          )}

          {/* Key Stats + Financial Data */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="panel" style={{padding:12}}>
              <h3 style={{margin:'0 0 8px 0', fontSize:13}}>Key Statistics</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11}}>
                <div><div style={{opacity:0.6}}>Trailing P/E</div><b>{stats.trailingPE?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>Forward P/E</div><b>{stats.forwardPE?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>Price/Book</div><b>{stats.priceToBook?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>Profit Margin</div><b>{fin.profitMargins?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>Revenue</div><b>{fin.totalRevenue?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>EBITDA Margin</div><b>{fin.ebitdaMargins?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>52W High</div><b>{stats.fiftyTwoWeekHigh?.fmt ?? '—'}</b></div>
                <div><div style={{opacity:0.6}}>52W Low</div><b>{stats.fiftyTwoWeekLow?.fmt ?? '—'}</b></div>
              </div>
            </div>
            <div className="panel" style={{padding:12}}>
              <h3 style={{margin:'0 0 8px 0', fontSize:13}}>Earnings (Yearly)</h3>
              {earnings.length ? (
                <table className="table">
                  <thead><tr><th>Year</th><th>Revenue</th><th>Earnings</th></tr></thead>
                  <tbody>
                    {earnings.slice(-4).map((e,i)=>(
                      <tr key={i}><td>{e.date}</td><td>{e.revenue?.fmt ?? '—'}</td><td>{e.earnings?.fmt ?? '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{fontSize:11, opacity:0.6}}>No earnings data (Yahoo) • Try AAPL, MSFT, RELIANCE.NS</div>}
            </div>
          </div>

          {/* Income Statement */}
          {income.length>0 && (
            <div className="panel" style={{padding:12, overflow:'auto'}}>
              <h3 style={{margin:'0 0 8px 0', fontSize:13}}>Income Statement (Annual)</h3>
              <table className="table" style={{minWidth:700}}>
                <thead><tr><th>Breakdown</th>{income.map((s,i)=><th key={i}>{s.endDate?.fmt?.slice(0,4) || i}</th>)}</tr></thead>
                <tbody>
                  {[
                    ['Total Revenue','totalRevenue'],
                    ['Cost of Revenue','costOfRevenue'],
                    ['Gross Profit','grossProfit'],
                    ['Net Income','netIncome'],
                  ].map(([label,key])=>(
                    <tr key={key}><td><b>{label}</b></td>{income.map((s,i)=><td key={i}>{s[key]?.fmt ?? '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Balance Sheet */}
          {balance.length>0 && (
            <div className="panel" style={{padding:12, overflow:'auto'}}>
              <h3 style={{margin:'0 0 8px 0', fontSize:13}}>Balance Sheet</h3>
              <table className="table" style={{minWidth:700}}>
                <thead><tr><th>Breakdown</th>{balance.map((s,i)=><th key={i}>{s.endDate?.fmt?.slice(0,4) || i}</th>)}</tr></thead>
                <tbody>
                  {[
                    ['Total Assets','totalAssets'],
                    ['Total Liabilities','totalLiab'],
                    ['Total Stockholder Equity','totalStockholderEquity'],
                  ].map(([label,key])=>(
                    <tr key={key}><td><b>{label}</b></td>{balance.map((s,i)=><td key={i}>{s[key]?.fmt ?? '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <div style={{color:'#f6465d', fontSize:12}}>Error: {error}</div>}
          <div style={{fontSize:10, opacity:0.5, textAlign:'center'}}>Source: Yahoo Finance internet • {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : ''} • Not financial advice</div>
        </div>
      </div>
    </div>
  )
}

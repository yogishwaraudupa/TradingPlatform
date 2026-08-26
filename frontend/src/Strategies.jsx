import React, { useMemo } from 'react'

function badgeSignal(sig){
  if(sig==='BUY') return {bg:'rgba(14,203,129,0.15)', color:'#0ecb81', label:'BUY'}
  if(sig==='SELL') return {bg:'rgba(246,70,93,0.15)', color:'#f6465d', label:'SELL'}
  return {bg:'#2b3139', color:'#848e9c', label:'HOLD'}
}

export default function Strategies({ enriched, symbol, onClose }){
  const signals = useMemo(()=>{
    if(!enriched || enriched.length<50) return []
    const last = enriched[enriched.length-1]
    const prev = enriched[enriched.length-2]
    const arr=[]
    // SMA20/50 crossover
    if(last.sma20 && last.sma50 && prev.sma20 && prev.sma50){
      const crossUp = prev.sma20 <= prev.sma50 && last.sma20 > last.sma50
      const crossDown = prev.sma20 >= prev.sma50 && last.sma20 < last.sma50
      arr.push({name:'SMA 20/50 Crossover', desc:`SMA20 ${last.sma20} vs SMA50 ${last.sma50}`, signal: crossUp?'BUY': crossDown?'SELL':'HOLD', strength: Math.abs(last.sma20-last.sma50).toFixed(2)})
    }
    // EMA20 vs price
    if(last.ema20){
      arr.push({name:'EMA 20 Trend', desc:`Price ${last.close} vs EMA20 ${last.ema20}`, signal: last.close>last.ema20?'BUY': last.close<last.ema20?'SELL':'HOLD', strength: ((last.close-last.ema20)/last.ema20*100).toFixed(2)+'%'})
    }
    // RSI
    if(last.rsi!=null){
      let sig='HOLD'; if(last.rsi>70) sig='SELL'; else if(last.rsi<30) sig='BUY'
      arr.push({name:'RSI 14', desc:`RSI ${last.rsi} (70 overbought / 30 oversold)`, signal:sig, strength: last.rsi})
    }
    // MACD
    if(last.macd!=null && last.macdSignal!=null){
      let sig='HOLD'; if(last.macd>last.macdSignal) sig='BUY'; else if(last.macd<last.macdSignal) sig='SELL'
      arr.push({name:'MACD 12,26,9', desc:`MACD ${last.macd} vs Signal ${last.macdSignal} Hist ${last.macdHist}`, signal:sig, strength: last.macdHist})
    }
    // Bollinger
    if(last.bbUpper && last.bbLower){
      let sig='HOLD'; if(last.close > last.bbUpper) sig='SELL'; else if(last.close < last.bbLower) sig='BUY'
      arr.push({name:'Bollinger 20,2', desc:`Upper ${last.bbUpper} Lower ${last.bbLower} Mid ${last.bbMid}`, signal:sig, strength: ((last.close-last.bbMid)/last.bbMid*100).toFixed(2)+'%'})
    }
    // SuperTrend
    if(last.supertrend!=null){
      arr.push({name:'SuperTrend 10,3', desc:`ST ${last.supertrend} Dir ${last.stDir===1?'Bull':'Bear'}`, signal: last.stDir===1?'BUY':'SELL', strength: last.supertrend})
    }
    // VWAP
    if(last.vwap!=null){
      arr.push({name:'VWAP', desc:`VWAP ${last.vwap} vs Price ${last.close}`, signal: last.close>last.vwap?'BUY':'SELL', strength: ((last.close-last.vwap)/last.vwap*100).toFixed(2)+'%'})
    }
    // Stochastic
    if(last.stochK!=null){
      let sig='HOLD'; if(last.stochK>80) sig='SELL'; else if(last.stochK<20) sig='BUY'
      arr.push({name:'Stochastic 14,3', desc:`%K ${last.stochK} %D ${last.stochD}`, signal:sig, strength: last.stochK})
    }
    // Combined
    const buys=arr.filter(x=>x.signal==='BUY').length, sells=arr.filter(x=>x.signal==='SELL').length
    let overall='HOLD'; if(buys>sells+1) overall='BUY'; else if(sells>buys+1) overall='SELL'
    arr.unshift({name:`OVERALL ${symbol}`, desc:`${buys} BUY vs ${sells} SELL of ${arr.length} strategies`, signal:overall, strength: `${buys}B/${sells}S`, highlight:true})
    return arr
  },[enriched, symbol])

  const overall = signals[0]

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', zIndex:60, overflow:'auto', padding:12}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:1100, margin:'10px auto', background:'#1e2329', border:'1px solid #2b3139', borderRadius:16, overflow:'hidden'}}>
        <div style={{padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2b3139', flexWrap:'wrap', gap:8}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <h2 style={{margin:0, fontSize:15}}>📊 Stock Analysis Strategies • {symbol}</h2>
            {overall && <span className="badge" style={{background: badgeSignal(overall.signal).bg, color: badgeSignal(overall.signal).color, borderColor: badgeSignal(overall.signal).color, fontWeight:800}}>{overall.signal} • {overall.strength}</span>}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12, padding:12}}>
          {signals.slice(1).map(s=>{
            const b=badgeSignal(s.signal)
            return (
              <div key={s.name} className="panel" style={{padding:12, borderLeft:`4px solid ${b.color}`}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <b style={{fontSize:12}}>{s.name}</b>
                  <span className="badge" style={{background:b.bg, color:b.color, borderColor:b.color, fontWeight:800}}>{b.label}</span>
                </div>
                <div style={{fontSize:11, opacity:0.7, marginBottom:6}}>{s.desc}</div>
                <div style={{fontSize:11, display:'flex', justifyContent:'space-between'}}>
                  <span style={{opacity:0.6}}>Strength</span><span style={{fontFamily:'JetBrains Mono,monospace', fontWeight:600}}>{s.strength}</span>
                </div>
                <div style={{marginTop:8, height:4, background:'#0b0e11', borderRadius:4, overflow:'hidden'}}>
                  <div style={{height:'100%', width: s.signal==='BUY'?'75%': s.signal==='SELL'?'75%':'35%', background:b.color, opacity:0.8}} />
                </div>
              </div>
            )
          })}
          {signals.length<=1 && <div style={{gridColumn:'1/-1', textAlign:'center', padding:20, opacity:0.6}}>Need 50+ candles for strategies • Current {enriched.length}</div>}
        </div>

        <div className="panel" style={{margin:12, padding:12}}>
          <h3 style={{margin:'0 0 8px 0', fontSize:13}}>How it works</h3>
          <ul style={{fontSize:11, opacity:0.7, margin:0, paddingLeft:16, lineHeight:1.6}}>
            <li><b>SMA/EMA Crossover:</b> BUY when short MA crosses above long MA, SELL when below</li>
            <li><b>RSI:</b> &lt;30 oversold BUY, &gt;70 overbought SELL</li>
            <li><b>MACD:</b> MACD above Signal BUY, below SELL</li>
            <li><b>Bollinger:</b> Price above upper SELL, below lower BUY</li>
            <li><b>SuperTrend/VWAP:</b> Price above line BUY, below SELL</li>
            <li><b>Stochastic:</b> K &lt;20 BUY, K &gt;80 SELL</li>
            <li><b>Overall:</b> Majority vote of all strategies (needs 2+ edge for BUY/SELL else HOLD)</li>
          </ul>
          <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
            <span style={{fontSize:11, opacity:0.6}}>Backtest (last 50):</span>
            <span className="badge">Win rate ~58% • Avg +1.2% per trade (demo)</span>
            <span className="badge" style={{background:'rgba(14,203,129,0.15)', borderColor:'#0ecb81'}}>Paper trade only • Not financial advice</span>
          </div>
        </div>

        <div style={{padding:'8px 12px', fontSize:11, opacity:0.6, borderTop:'1px solid #2b3139', textAlign:'center'}}>
          Strategies update live with candles • {enriched.length} candles • {symbol} • Click any strategy to apply to chart (coming soon)
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useRef } from 'react'

const TV_MAP = {
  'AAPL':'NASDAQ:AAPL',
  'MSFT':'NASDAQ:MSFT',
  'TSLA':'NASDAQ:TSLA',
  'NVDA':'NASDAQ:NVDA',
  'GOOGL':'NASDAQ:GOOGL',
  'AMZN':'NASDAQ:AMZN',
  'META':'NASDAQ:META',
  'NFLX':'NASDAQ:NFLX',
  'AMD':'NASDAQ:AMD',
  'JPM':'NYSE:JPM',
  'RELIANCE.NS':'NSE:RELIANCE',
  'TCS.NS':'NSE:TCS',
  'INFY.NS':'NSE:INFY',
  'HDFCBANK.NS':'NSE:HDFCBANK',
  'ICICIBANK.NS':'NSE:ICICIBANK',
  'SBIN.NS':'NSE:SBIN',
  'BHARTIARTL.NS':'NSE:BHARTIARTL',
  'ITC.NS':'NSE:ITC',
  'KOTAKBANK.NS':'NSE:KOTAKBANK',
  'LT.NS':'NSE:LT',
  'BTC-USD':'BINANCE:BTCUSD',
  'ETH-USD':'BINANCE:ETHUSD',
  'SOL-USD':'BINANCE:SOLUSD',
  'BNB-USD':'BINANCE:BNBUSDT',
  'XRP-USD':'BINANCE:XRPUSDT',
  'GOLD':'TVC:GOLD',
  'SILVER':'TVC:SILVER',
  'CRUDEOIL':'NYMEX:CL1!',
  'COPPER':'COMEX:HG1!',
  'NIFTY':'NSE:NIFTY',
  'SENSEX':'BSE:SENSEX',
  'BANKNIFTY':'NSE:BANKNIFTY',
  'SPX':'FOREXCOM:SPXUSD',
  'DJI':'FOREXCOM:DJI',
  'NASDAQ':'NASDAQ:IXIC',
  'FTSE':'TVC:UKX',
  'NIKKEI':'TVC:NI225',
}

function toTV(symbol){
  if(TV_MAP[symbol]) return TV_MAP[symbol]
  // fallback: try Yahoo map style
  if(symbol.includes('.NS')) return `NSE:${symbol.replace('.NS','')}`
  if(symbol.endsWith('=X') || symbol.includes('/')) return `FX:${symbol}`
  if(symbol.startsWith('^')) return `TVC:${symbol.replace('^','')}`
  return symbol
}

export default function TradingViewWidget({ symbol='AAPL', theme='dark' }){
  const containerRef = useRef(null)
  const tvSymbol = toTV(symbol)

  useEffect(()=>{
    if(!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = ()=>{
      if(window.TradingView){
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: 'D',
          timezone: 'Asia/Kolkata',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: false,
          container_id: `tv_${symbol.replace(/[^A-Z0-9]/g,'')}`,
          studies: ['MASimple@tv-basicstudies','RSI@tv-basicstudies','MACD@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          withdateranges: true,
          hide_side_toolbar: false,
          details: true,
          hotlist: true,
          calendar: true,
        })
      }
    }
    containerRef.current.appendChild(script)

    // Fallback embed method (advanced chart)
    const fallbackTimer = setTimeout(()=>{
      if(!containerRef.current.querySelector('iframe') && !window.TradingView){
        // use embed widget as fallback
        containerRef.current.innerHTML = `
          <div class="tradingview-widget-container" style="height:360px">
            <div id="tradingview_${symbol}" style="height:360px"></div>
            <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
            {
              "autosize": true,
              "symbol": "${tvSymbol}",
              "interval": "D",
              "timezone": "Etc/UTC",
              "theme": "dark",
              "style": "1",
              "locale": "en",
              "enable_publishing": false,
              "allow_symbol_change": true,
              "calendar": false,
              "support_host": "https://www.tradingview.com"
            }
            </script>
          </div>
        `
      }
    }, 3000)

    return ()=>{ clearTimeout(fallbackTimer); if(containerRef.current) containerRef.current.innerHTML='' }
  },[tvSymbol, symbol, theme])

  return (
    <div style={{height:380, background:'#0b0e11', position:'relative'}}>
      <div style={{position:'absolute', top:6, left:10, zIndex:2, fontSize:10, opacity:0.6, background:'rgba(30,35,41,0.8)', padding:'3px 6px', borderRadius:6, border:'1px solid #2b3139'}}>
        TradingView • {tvSymbol} • Drawing tools + 100+ indicators • <span style={{color:'#f0b90b'}}>Full features</span>
      </div>
      <div id={`tv_${symbol.replace(/[^A-Z0-9]/g,'')}`} ref={containerRef} style={{height:380, width:'100%'}} />
    </div>
  )
}

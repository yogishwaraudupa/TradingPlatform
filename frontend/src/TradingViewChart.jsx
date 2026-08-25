import React, { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function TradingViewChart({ data, symbol, showVolume=true, sma20Data, sma50Data, ema20Data, cagrLine }){
  const containerRef = useRef(null)

  useEffect(()=>{
    if(!containerRef.current || !data.length) return
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0b0e11' }, textColor: '#848e9c' },
      grid: { vertLines: { color: 'rgba(43,49,57,0.3)' }, horzLines: { color: 'rgba(43,49,57,0.3)' } },
      width: containerRef.current.clientWidth,
      height: 360,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2b3139' },
      timeScale: { borderColor: '#2b3139', timeVisible: true, secondsVisible: false },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81', downColor: '#f6465d',
      borderUpColor: '#0ecb81', borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81', wickDownColor: '#f6465d',
    })

    const chartData = data.map(d=> ({
      time: Math.floor(d.time/1000),
      open: d.open, high: d.high, low: d.low, close: d.close
    }))
    candleSeries.setData(chartData)

    if(showVolume){
      const volSeries = chart.addHistogramSeries({
        priceScaleId: '',
        priceFormat: { type: 'volume' },
      })
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
      volSeries.setData(data.map(d=> ({
        time: Math.floor(d.time/1000),
        value: d.volume,
        color: d.close >= d.open ? 'rgba(14,203,129,0.4)' : 'rgba(246,70,93,0.4)'
      })))
    }

    const addLine = (key, color, dash)=>{
      if(!data[0] || data[0][key]==null) return
      const line = chart.addLineSeries({ color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, lineStyle: dash?2:0 })
      line.setData(data.filter(d=> d[key]!=null).map(d=> ({ time: Math.floor(d.time/1000), value: d[key] })))
      return line
    }
    if(sma20Data) addLine('sma20', '#00bfff')
    if(sma50Data) addLine('sma50', '#ff8c00')
    if(ema20Data) addLine('ema20', '#a78bfa', true)

    // CAGR projection line (dashed yellow)
    if(cagrLine && cagrLine.length){
      const cagrSeries = chart.addLineSeries({ color: '#f0b90b', lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: true, title: `CAGR ${cagrLine[0]?.label||''}` })
      cagrSeries.setData(cagrLine.map(d=> ({ time: Math.floor(d.time/1000), value: d.value })))
    }

    chart.priceScale('right').applyOptions({ autoScale: true })
    chart.timeScale().fitContent()
    const handleResize = ()=> chart.applyOptions({ width: containerRef.current.clientWidth })
    window.addEventListener('resize', handleResize)
    return ()=>{ window.removeEventListener('resize', handleResize); chart.remove() }
  }, [data, showVolume, sma20Data, sma50Data, ema20Data, cagrLine])

  return <div ref={containerRef} style={{width:'100%', height:360}} />
}


import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tick, OrderBook } from '../types';
import { HistoryService, TimeFrame, HistoricalPoint } from '../services/HistoryService';
import { Calendar, Clock, Activity, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

interface ChartWidgetProps {
  data: Tick[];
  symbol: string;
  orderBook: OrderBook;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ data, symbol, orderBook }) => {
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORICAL'>('LIVE');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1H');
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customDate, setCustomDate] = useState<string>('');

  // Fetch History when mode or timeframe changes
  useEffect(() => {
    if (viewMode === 'HISTORICAL' && timeFrame !== 'CUSTOM') {
      loadHistory(timeFrame);
    }
  }, [viewMode, timeFrame, symbol]);

  const loadHistory = async (tf: TimeFrame, date?: string) => {
    setIsLoading(true);
    try {
      let start: Date | undefined;
      if (tf === 'CUSTOM' && date) {
        start = new Date(date);
      }
      const points = await HistoryService.fetchHistory(symbol, tf, start);
      setHistoricalData(points);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
    setViewMode('HISTORICAL');
    setTimeFrame('CUSTOM');
    loadHistory('CUSTOM', e.target.value);
  };

  // Prepare Data for Chart
  const chartData = useMemo(() => {
    if (viewMode === 'LIVE') {
      return data.map(t => ({
        time: t.timestamp, // Keep raw for formatting
        formattedTime: new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
        price: t.price,
      }));
    } else {
      return historicalData.map(t => ({
        time: t.timestamp,
        formattedTime: new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        price: t.price,
      }));
    }
  }, [viewMode, data, historicalData]);

  // Calculate Last Price (Always from Live Feed for the header/orderbook)
  const lastPrice = data.length > 0 ? data[data.length - 1].price : 0;

  // Calculate Spread
  const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : 0;
  const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : 0;
  const spread = (bestAsk > 0 && bestBid > 0) ? bestAsk - bestBid : 0;
  const spreadPct = lastPrice > 0 ? (spread / lastPrice) * 100 : 0;

  return (
    <div className="h-full w-full bg-terminal-dark rounded border border-terminal-border flex flex-col overflow-hidden">
      {/* Header / Toolbar */}
      <div className="px-3 py-2 border-b border-terminal-border flex justify-between items-center bg-terminal-bg shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="font-bold text-sm text-gray-200">{symbol} / USD</span>
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                    {viewMode === 'LIVE' ? <><Activity size={10} className="text-terminal-green" /> REALTIME</> : <><Clock size={10} className="text-terminal-yellow" /> HISTORICAL</>}
                </span>
            </div>
            
            {/* Timeframe Controls */}
            <div className="flex bg-[#0d1117] border border-terminal-border rounded p-0.5">
                <button 
                    onClick={() => setViewMode('LIVE')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${viewMode === 'LIVE' ? 'bg-terminal-green text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    LIVE
                </button>
                <div className="w-px bg-terminal-border mx-1 my-0.5"></div>
                {(['1H', '4H', '1D', '1W'] as TimeFrame[]).map(tf => (
                    <button
                        key={tf}
                        onClick={() => { setViewMode('HISTORICAL'); setTimeFrame(tf); }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${viewMode === 'HISTORICAL' && timeFrame === tf ? 'bg-terminal-blue text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1 bg-[#0d1117] border border-terminal-border rounded px-2 py-0.5 group focus-within:border-terminal-blue">
                <Calendar size={12} className="text-gray-500 group-focus-within:text-terminal-blue" />
                <input 
                    type="date" 
                    className="bg-transparent text-[10px] text-gray-300 outline-none font-mono w-24"
                    onChange={handleCustomDateChange}
                />
            </div>
        </div>

        <div className="flex items-center gap-2">
            {isLoading && <RefreshCw size={14} className="animate-spin text-terminal-blue" />}
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white">${lastPrice.toFixed(2)}</span>
                <span className="text-[10px] text-terminal-green">+0.00%</span>
            </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex">
        {/* Chart Area */}
        <div className="flex-[3] border-r border-terminal-border relative">
             {isLoading ? (
                 <div className="w-full h-full flex items-center justify-center text-terminal-blue animate-pulse font-mono text-xs">
                     LOADING HISTORICAL DATA...
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={viewMode === 'LIVE' ? "#58a6ff" : "#d29922"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={viewMode === 'LIVE' ? "#58a6ff" : "#d29922"} stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                    <XAxis 
                        dataKey="formattedTime" 
                        stroke="#8b949e" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}} 
                        tickLine={false}
                        interval={Math.floor(chartData.length / 5)} 
                        minTickGap={30}
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        orientation="right" 
                        stroke="#8b949e" 
                        tick={{fontSize: 10, fontFamily: 'monospace'}}
                        tickFormatter={(val) => val.toFixed(0)}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#0d1117', borderColor: '#30363d', color: '#c9d1d9', fontSize: '12px'}}
                        itemStyle={{color: viewMode === 'LIVE' ? '#58a6ff' : '#d29922'}}
                        labelStyle={{color: '#8b949e'}}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke={viewMode === 'LIVE' ? "#58a6ff" : "#d29922"} 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        isAnimationActive={false} 
                        strokeWidth={1.5}
                    />
                </AreaChart>
                </ResponsiveContainer>
             )}
            
             {viewMode === 'LIVE' && (
                <div className="absolute top-2 left-2 bg-terminal-dark/80 border border-terminal-border px-2 py-1 rounded text-xs font-mono z-10 shadow-sm pointer-events-none">
                    <span className="text-gray-400 mr-1">Last:</span> 
                    <span className="text-white font-bold">{lastPrice.toFixed(2)}</span>
                </div>
             )}
             {viewMode === 'HISTORICAL' && (
                 <div className="absolute top-2 left-2 bg-terminal-yellow/10 border border-terminal-yellow/30 px-2 py-1 rounded text-xs font-mono z-10 pointer-events-none text-terminal-yellow">
                    ARCHIVE MODE: {timeFrame}
                 </div>
             )}
        </div>

        {/* Order Book Area (Live Real Data) */}
        <div className="flex-1 flex flex-col bg-[#0d1117] text-[10px] font-mono min-w-[140px]">
            <div className="p-1 text-center text-gray-500 border-b border-terminal-border bg-terminal-bg/30">Order Book (Live)</div>
            
            <div className="flex justify-between px-2 py-1 text-gray-600 border-b border-terminal-border">
                <span>Price</span>
                <span>Size</span>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="flex-1 flex flex-col justify-end overflow-hidden pb-1">
                {orderBook.asks.slice(0, 15).reverse().map((ask, i) => (
                    <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 hover:bg-terminal-red/5 relative group cursor-pointer">
                        <div 
                          className="absolute inset-0 bg-terminal-red/10 transition-all duration-200 opacity-20 right-0 left-auto"
                          style={{ width: `${Math.min(ask.size * 20, 100)}%` }}
                        ></div>
                        <span className="text-terminal-red z-10">{ask.price.toFixed(1)}</span>
                        <span className="text-gray-400 z-10">{ask.size.toFixed(3)}</span>
                    </div>
                ))}
            </div>

            {/* Spread & Last Price */}
            <div className="border-y border-terminal-border py-1 flex flex-col items-center justify-center bg-terminal-bg shadow-inner">
                <div className="text-white font-bold text-xs">{lastPrice.toFixed(2)}</div>
                <div className="text-[9px] text-gray-500 flex items-center gap-1">
                    <span>Spread:</span>
                    <span className="text-gray-400">{spread.toFixed(2)} ({spreadPct.toFixed(3)}%)</span>
                </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="flex-1 flex flex-col justify-start overflow-hidden pt-1">
                {orderBook.bids.slice(0, 15).map((bid, i) => (
                    <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 hover:bg-terminal-green/5 relative group cursor-pointer">
                         <div 
                          className="absolute inset-0 bg-terminal-green/10 transition-all duration-200 opacity-20"
                          style={{ width: `${Math.min(bid.size * 20, 100)}%` }}
                        ></div>
                        <span className="text-terminal-green z-10">{bid.price.toFixed(1)}</span>
                        <span className="text-gray-400 z-10">{bid.size.toFixed(3)}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

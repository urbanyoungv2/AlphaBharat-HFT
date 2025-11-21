import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tick, OrderBook } from '../types';
import { HistoryService, TimeFrame, HistoricalPoint } from '../services/HistoryService';
import { Calendar, Clock, Activity, RefreshCw, ChevronDown } from 'lucide-react';

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

  // Fetch History
  useEffect(() => {
    if (viewMode === 'HISTORICAL' && timeFrame !== 'CUSTOM') {
      loadHistory(timeFrame);
    }
  }, [viewMode, timeFrame, symbol]);

  const loadHistory = async (tf: TimeFrame, date?: string) => {
    setIsLoading(true);
    try {
      let start: Date | undefined;
      if (tf === 'CUSTOM' && date) start = new Date(date);
      const points = await HistoryService.fetchHistory(symbol, tf, start);
      setHistoricalData(points);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setViewMode('HISTORICAL');
    setTimeFrame('CUSTOM');
    loadHistory('CUSTOM', e.target.value);
  };

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const sourceData = viewMode === 'LIVE' ? data : historicalData;
    return sourceData.map(t => ({
      time: t.timestamp,
      formattedTime: viewMode === 'LIVE' 
        ? new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })
        : new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
      price: t.price,
    }));
  }, [viewMode, data, historicalData]);

  const lastPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const prevPrice = data.length > 1 ? data[data.length - 2].price : lastPrice;
  const priceChange = lastPrice - prevPrice;
  const priceColor = priceChange >= 0 ? 'text-trade-up' : 'text-trade-down';

  // Spread Calculation
  const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : 0;
  const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : 0;
  const spread = (bestAsk > 0 && bestBid > 0) ? bestAsk - bestBid : 0;
  const spreadPct = lastPrice > 0 ? (spread / lastPrice) * 100 : 0;

  return (
    <div className="h-full w-full bg-surface-900 rounded-lg border border-surface-800 flex flex-col overflow-hidden shadow-sm">
      {/* Professional Toolbar */}
      <div className="px-4 py-3 border-b border-surface-800 flex justify-between items-center bg-surface-900/80 backdrop-blur-sm shrink-0 gap-4">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <div className="flex flex-col shrink-0">
                <div className="flex items-center gap-2">
                   <span className="font-bold text-lg text-text-primary">{symbol}</span>
                   <span className="text-xs px-1.5 py-0.5 rounded bg-surface-800 text-text-secondary font-mono">PERP</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium flex items-center gap-1 ${viewMode === 'LIVE' ? 'text-brand-blue' : 'text-trade-warn'}`}>
                        {viewMode === 'LIVE' ? <Activity size={10} /> : <Clock size={10} />}
                        {viewMode === 'LIVE' ? 'REALTIME' : 'ARCHIVE'}
                    </span>
                </div>
            </div>
            
            <div className="h-8 w-px bg-surface-800 shrink-0 hidden sm:block"></div>

            {/* Controls */}
            <div className="flex items-center bg-surface-950 border border-surface-800 rounded-md p-1 shrink-0">
                <button 
                    onClick={() => setViewMode('LIVE')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-colors ${viewMode === 'LIVE' ? 'bg-surface-800 text-brand-blue shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    LIVE
                </button>
                <div className="w-px bg-surface-800 mx-1 h-3"></div>
                {(['1H', '4H', '1D', '1W'] as TimeFrame[]).map(tf => (
                    <button
                        key={tf}
                        onClick={() => { setViewMode('HISTORICAL'); setTimeFrame(tf); }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-colors ${viewMode === 'HISTORICAL' && timeFrame === tf ? 'bg-surface-800 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <div className="relative group shrink-0 hidden md:block">
                <div className="flex items-center gap-2 bg-surface-950 border border-surface-800 hover:border-surface-700 rounded-md px-2 py-1.5 transition-colors">
                    <Calendar size={12} className="text-text-secondary" />
                    <input 
                        type="date" 
                        className="bg-transparent text-[10px] text-text-primary outline-none font-mono w-24 uppercase"
                        onChange={handleCustomDateChange}
                    />
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
            {isLoading && <RefreshCw size={14} className="animate-spin text-brand-blue" />}
            <div className="flex flex-col items-end">
                <span className={`text-lg font-mono font-bold ${priceColor}`}>${lastPrice.toFixed(2)}</span>
                <span className="text-[10px] text-text-muted font-mono">USD</span>
            </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex">
        {/* Chart Area */}
        <div className="flex-[3] border-r border-surface-800 relative bg-gradient-to-b from-surface-900 to-surface-950">
             {isLoading ? (
                 <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-text-muted">
                     <RefreshCw size={24} className="animate-spin text-brand-blue" />
                     <span className="text-xs font-mono">RETRIEVING MARKET DATA...</span>
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={viewMode === 'LIVE' ? "#3b82f6" : "#f59e0b"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={viewMode === 'LIVE' ? "#3b82f6" : "#f59e0b"} stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                        dataKey="formattedTime" 
                        stroke="#52525b" 
                        tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}} 
                        tickLine={false}
                        axisLine={false}
                        minTickGap={40}
                        dy={10}
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        orientation="right" 
                        stroke="#52525b" 
                        tick={{fontSize: 10, fontFamily: 'JetBrains Mono'}}
                        tickFormatter={(val) => val.toFixed(0)}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        itemStyle={{color: viewMode === 'LIVE' ? '#60a5fa' : '#fbbf24'}}
                        labelStyle={{color: '#a1a1aa', marginBottom: '4px', fontFamily: 'JetBrains Mono'}}
                        cursor={{stroke: '#3f3f46', strokeWidth: 1}}
                    />
                    <Area 
                        type="step" 
                        dataKey="price" 
                        stroke={viewMode === 'LIVE' ? "#3b82f6" : "#f59e0b"} 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        isAnimationActive={false} 
                        strokeWidth={2}
                    />
                </AreaChart>
                </ResponsiveContainer>
             )}
        </div>

        {/* Order Book (Depth Ladder) */}
        <div className="w-[200px] flex flex-col bg-surface-950 border-l border-surface-800 font-mono text-[10px] shrink-0 hidden md:flex">
            <div className="px-3 py-2 text-xs font-medium text-text-secondary border-b border-surface-800 bg-surface-900">Order Book</div>
            
            <div className="flex justify-between px-3 py-1.5 text-text-muted border-b border-surface-800 bg-surface-900/50">
                <span>Price (USD)</span>
                <span>Qty</span>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="flex-1 flex flex-col justify-end overflow-hidden pb-1 relative">
                {orderBook.asks.slice(0, 15).reverse().map((ask, i) => (
                    <div key={`ask-${i}`} className="flex justify-between items-center px-3 py-0.5 relative z-10 hover:bg-surface-800 cursor-pointer group">
                         <span className="text-trade-down group-hover:font-bold transition-all">{ask.price.toFixed(1)}</span>
                         <span className="text-text-secondary">{ask.size.toFixed(3)}</span>
                         {/* Depth Bar */}
                         <div 
                             className="absolute right-0 top-0 bottom-0 bg-trade-down/10 z-[-1] transition-all"
                             style={{ width: `${Math.min(ask.size * 15, 100)}%` }}
                         ></div>
                    </div>
                ))}
            </div>

            {/* Spread Info */}
            <div className="border-y border-surface-800 py-2 flex flex-col items-center justify-center bg-surface-900 z-20 shadow-sm">
                <div className={`text-sm font-bold ${priceColor}`}>{lastPrice.toFixed(2)}</div>
                <div className="text-[9px] text-text-muted flex items-center gap-2 mt-0.5">
                    <span>Spread: <span className="text-text-primary">{spread.toFixed(2)}</span></span>
                    <span>{(spreadPct).toFixed(3)}%</span>
                </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="flex-1 flex flex-col justify-start overflow-hidden pt-1 relative">
                {orderBook.bids.slice(0, 15).map((bid, i) => (
                    <div key={`bid-${i}`} className="flex justify-between items-center px-3 py-0.5 relative z-10 hover:bg-surface-800 cursor-pointer group">
                         <span className="text-trade-up group-hover:font-bold transition-all">{bid.price.toFixed(1)}</span>
                         <span className="text-text-secondary">{bid.size.toFixed(3)}</span>
                         {/* Depth Bar */}
                         <div 
                             className="absolute right-0 top-0 bottom-0 bg-trade-up/10 z-[-1] transition-all"
                             style={{ width: `${Math.min(bid.size * 15, 100)}%` }}
                         ></div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
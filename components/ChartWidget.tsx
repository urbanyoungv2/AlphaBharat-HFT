import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tick } from '../types';

interface ChartWidgetProps {
  data: Tick[];
  symbol: string;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ data, symbol }) => {
  const lastPrice = data.length > 0 ? data[data.length - 1].price : 0;

  const formattedData = data.map(t => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
    price: t.price,
  }));

  // Generate Mock Order Book based on last price
  // Memoized to update only when data changes (simulation tick)
  const orderBook = useMemo(() => {
    if (!lastPrice) return { bids: [], asks: [] };
    
    // Generate asks (sellers) above current price
    // Using a fixed seed effect or purely random for simulation
    const asks = Array.from({ length: 15 }).map((_, i) => ({
      price: lastPrice + (i + 1) * (Math.random() * 2 + 0.1), // Tighter spread
      size: Math.random() * 2 + 0.1,
    }));

    // Generate bids (buyers) below current price
    const bids = Array.from({ length: 15 }).map((_, i) => ({
      price: lastPrice - (i + 1) * (Math.random() * 2 + 0.1),
      size: Math.random() * 2 + 0.1,
    }));

    return { bids, asks };
  }, [lastPrice, data.length]);

  return (
    <div className="h-full w-full bg-terminal-dark rounded border border-terminal-border flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-terminal-border flex justify-between items-center bg-terminal-bg shrink-0">
        <span className="font-bold text-sm text-gray-200">{symbol} / USD - Realtime Feed</span>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></span>
            <span className="text-xs text-gray-500 font-mono">Connected (FIX 4.4)</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex">
        {/* Chart Area */}
        <div className="flex-[3] border-r border-terminal-border relative">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#8b949e" 
                    tick={{fontSize: 10, fontFamily: 'monospace'}} 
                    tickLine={false}
                    interval="preserveStartEnd"
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
                    itemStyle={{color: '#58a6ff'}}
                    labelStyle={{color: '#8b949e'}}
                />
                <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#58a6ff" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    isAnimationActive={false} 
                    strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
            
             <div className="absolute top-2 left-2 bg-terminal-dark/80 border border-terminal-border px-2 py-1 rounded text-xs font-mono z-10 shadow-sm">
                <span className="text-gray-400 mr-1">Last:</span> 
                <span className="text-white font-bold">{lastPrice.toFixed(2)}</span>
            </div>
        </div>

        {/* Order Book Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] text-[10px] font-mono min-w-[140px]">
            <div className="p-1 text-center text-gray-500 border-b border-terminal-border bg-terminal-bg/30">Order Book</div>
            
            <div className="flex justify-between px-2 py-1 text-gray-600 border-b border-terminal-border">
                <span>Price</span>
                <span>Size</span>
            </div>

            {/* Asks (Sell orders) - Reversed to show spread at bottom */}
            <div className="flex-1 flex flex-col justify-end overflow-hidden pb-1">
                {orderBook.asks.slice(0, 15).reverse().map((ask, i) => (
                    <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 hover:bg-terminal-red/5 relative group cursor-pointer">
                        {/* Depth Bar */}
                        <div 
                          className="absolute inset-0 bg-terminal-red/10 transition-all duration-200 opacity-20 right-0 left-auto"
                          style={{ width: `${Math.min(ask.size * 20, 100)}%` }}
                        ></div>
                        <span className="text-terminal-red z-10">{ask.price.toFixed(1)}</span>
                        <span className="text-gray-400 z-10">{ask.size.toFixed(3)}</span>
                    </div>
                ))}
            </div>

            {/* Spread / Current Price Indicator */}
            <div className="border-y border-terminal-border py-1 text-center bg-terminal-bg font-bold text-white shadow-inner">
                {lastPrice.toFixed(2)}
            </div>

            {/* Bids (Buy orders) */}
            <div className="flex-1 flex flex-col justify-start overflow-hidden pt-1">
                {orderBook.bids.slice(0, 15).map((bid, i) => (
                    <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 hover:bg-terminal-green/5 relative group cursor-pointer">
                         {/* Depth Bar */}
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
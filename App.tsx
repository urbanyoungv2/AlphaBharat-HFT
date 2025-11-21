import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tick, Strategy, StrategyStatus, LogEntry, Position, Side, OrderType, ExchangeProfile, OrderBook } from './types';
import { ChartWidget } from './components/ChartWidget';
import { StrategyControl } from './components/StrategyControl';
import { LogPanel } from './components/LogPanel';
import { MetricCard } from './components/MetricCard';
import { RiskStatus } from './components/RiskStatus';
import { ConnectionModal } from './components/ConnectionModal';
import { analyzeMarketSentiment, optimizeStrategyCode } from './services/geminiService';
import { RiskManager, runRiskTests, RiskConfig } from './services/RiskManager';
import { ExchangeFactory, IExchange } from './services/ExchangeService';
import { Activity, Server, ShieldCheck, BrainCircuit, Send, Globe, Wifi, WifiOff, Settings, DollarSign, Zap, Cpu } from 'lucide-react';

const DEFAULT_SYMBOL = "BTCUSDT"; 

const INITIAL_RISK_CONFIG: RiskConfig = {
  maxPositionSizeUSD: 2000000, 
  maxDailyLossPerStrategy: 50000,
  maxGlobalDailyLoss: 100000,
  maxOrderValue: 500000,
  restrictedSymbols: ['LUNA', 'FTT'],
  correlationGroups: [
    { id: 'CRYPTO_L1', name: 'L1 Crypto', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], maxExposureUSD: 3000000 },
    { id: 'STABLE', name: 'Stablecoins', symbols: ['USDC', 'USDT'], maxExposureUSD: 5000000 }
  ]
};

const DEFAULT_PROFILES: ExchangeProfile[] = [
    { id: 'p1', name: 'Internal Simulator', type: 'PRESET', providerId: 'SIMULATION' },
    { id: 'p2', name: 'Binance Spot (Live)', type: 'PRESET', providerId: 'BINANCE' },
    { id: 'p3', name: 'Coinbase Pro (Live)', type: 'PRESET', providerId: 'COINBASE' }
];

export default function App() {
  const [profiles, setProfiles] = useState<ExchangeProfile[]>(DEFAULT_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<ExchangeProfile>(DEFAULT_PROFILES[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [ticks, setTicks] = useState<Tick[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ symbol: DEFAULT_SYMBOL, bids: [], asks: [], timestamp: Date.now() });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([
    { id: 'ST-001', name: 'MarketMaker_L1', language: 'Rust', status: StrategyStatus.RUNNING, pnl: 12450.50, latency: 12, memoryUsage: 64 },
    { id: 'ST-002', name: 'Arb_Tri_05', language: 'C++', status: StrategyStatus.PAUSED, pnl: 4320.10, latency: 45, memoryUsage: 128 },
    { id: 'ST-003', name: 'Momentum_Alpha', language: 'Python', status: StrategyStatus.STOPPED, pnl: -120.00, latency: 850, memoryUsage: 512 },
  ]);
  
  const [portfolio, setPortfolio] = useState<Record<string, Position>>({
      'ETHUSDT': { symbol: 'ETHUSDT', quantity: 150, averagePrice: 3200, marketValue: 480000 },
      [DEFAULT_SYMBOL]: { symbol: DEFAULT_SYMBOL, quantity: 0, averagePrice: 0, marketValue: 0 }
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orderQty, setOrderQty] = useState<string>("0.01");
  const [isConnected, setIsConnected] = useState(false);

  const exchangeRef = useRef<IExchange>(ExchangeFactory.create(DEFAULT_PROFILES[0]));
  const riskManager = useMemo(() => new RiskManager(INITIAL_RISK_CONFIG), []);

  const addLog = useCallback((level: 'INFO' | 'WARN' | 'ERROR', component: string, message: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      level,
      component,
      message
    };
    setLogs(prev => [...prev.slice(-100), newLog]);
  }, []);

  useEffect(() => {
    const testResults = runRiskTests();
    testResults.forEach(res => {
      const level = res.startsWith('FAIL') ? 'ERROR' : 'INFO';
      addLog(level, 'RiskEngine', res);
    });
  }, [addLog]);

  useEffect(() => {
    const initExchange = async () => {
      if (exchangeRef.current) {
        exchangeRef.current.disconnect();
        setIsConnected(false);
      }

      const newExchange = ExchangeFactory.create(currentProfile);
      exchangeRef.current = newExchange;
      
      addLog('INFO', 'System', `Initializing uplink to ${currentProfile.name}...`);

      newExchange.subscribeToTicker((tick) => {
        setTicks(prev => {
          const newHistory = [...prev, tick];
          return newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
        });

        setPortfolio(prev => {
            const currentPos = prev[tick.symbol] || { symbol: tick.symbol, quantity: 0, averagePrice: 0, marketValue: 0 };
            return {
                ...prev,
                [tick.symbol]: {
                    ...currentPos,
                    marketValue: Math.abs(currentPos.quantity * tick.price)
                }
            };
        });

        setStrategies(prev => prev.map(s => {
          if (s.status === StrategyStatus.RUNNING) {
             const pnlChange = (Math.random() - 0.45) * 2;
             return { ...s, pnl: s.pnl + pnlChange };
          }
          return s;
        }));
      });

      newExchange.subscribeToOrderBook(DEFAULT_SYMBOL, (book) => setOrderBook(book));

      try {
        await newExchange.connect(DEFAULT_SYMBOL);
        setIsConnected(true);
        addLog('INFO', 'System', `Uplink Established: ${currentProfile.name}`);
      } catch (err) {
        addLog('ERROR', 'System', `Connection Failed: ${err}`);
        setIsConnected(false);
      }
    };

    initExchange();

    return () => {
      if (exchangeRef.current) exchangeRef.current.disconnect();
    };
  }, [currentProfile, addLog]);

  const handleStrategyToggle = (id: string, status: StrategyStatus) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    addLog('INFO', 'StrategyEngine', `Strategy ${id} transitioned to ${status}`);
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    addLog('INFO', 'Gemini', 'Requesting market sentiment vector...');
    const result = await analyzeMarketSentiment(ticks, DEFAULT_SYMBOL);
    setAiAnalysis(result);
    setIsAnalyzing(false);
    addLog('INFO', 'Gemini', 'Vector analysis received.');
  };

  const handleCodeOptimization = async (strategy: Strategy) => {
    addLog('INFO', 'Gemini', `Analyzing AST for ${strategy.name}...`);
    const mockCode = strategy.language === 'Rust' 
      ? "fn calculate_signal(price: f64) -> bool { let threshold = 0.5; price > threshold }" 
      : "def calculate_signal(price): return price > 0.5";
    const result = await optimizeStrategyCode(strategy.name, mockCode);
    alert(result);
  };

  const handleOrder = async (side: Side) => {
    if (!isConnected) {
        addLog('ERROR', 'OrderGateway', 'Cannot place order: Uplink Down');
        return;
    }

    const qty = parseFloat(orderQty);
    if (isNaN(qty) || qty <= 0) return;

    const currentPrice = ticks.length > 0 ? ticks[ticks.length - 1].price : 0;
    const totalPnL = strategies.reduce((acc, s) => acc + s.pnl, 0);
    const allPositions = Object.values(portfolio);

    const riskResult = riskManager.validateOrder(
        DEFAULT_SYMBOL, side, currentPrice, qty, allPositions, null, totalPnL
    );

    if (!riskResult.allowed) {
        addLog('ERROR', 'RiskManager', `REJECT: ${riskResult.reason}`);
        return;
    }

    addLog('INFO', 'OrderGateway', `SUBMIT: ${side} ${qty} ${DEFAULT_SYMBOL} @ MKT`);
    
    try {
        const filledOrder = await exchangeRef.current.executeOrder(
            DEFAULT_SYMBOL, side, qty, currentPrice, OrderType.LIMIT
        );

        setPortfolio(prev => {
            const prevPos = prev[DEFAULT_SYMBOL] || { symbol: DEFAULT_SYMBOL, quantity: 0, averagePrice: 0, marketValue: 0 };
            const newQuantity = side === Side.BUY ? prevPos.quantity + qty : prevPos.quantity - qty;
            let newAvgPrice = prevPos.averagePrice;
            if (side === Side.BUY) {
                const totalVal = (prevPos.quantity * prevPos.averagePrice) + (qty * filledOrder.price);
                newAvgPrice = totalVal / newQuantity;
            }
            if (Math.abs(newQuantity) < 0.000001) newAvgPrice = 0;

            return {
                ...prev,
                [DEFAULT_SYMBOL]: {
                    symbol: DEFAULT_SYMBOL,
                    quantity: newQuantity,
                    averagePrice: Math.abs(newAvgPrice),
                    marketValue: Math.abs(newQuantity * currentPrice)
                }
            };
        });

        addLog('INFO', 'OrderGateway', `EXECUTION: ${filledOrder.id} - ${side} ${qty} @ ${filledOrder.price}`);
    } catch (err) {
        addLog('ERROR', 'OrderGateway', `EXCHANGE REJECT: ${err}`);
    }
  };

  const totalPnL = strategies.reduce((acc, s) => acc + s.pnl, 0);
  const lastPrice = ticks.length > 0 ? ticks[ticks.length - 1].price : 0;
  const currentPosition = portfolio[DEFAULT_SYMBOL];

  const groupExposures = useMemo(() => {
     const groups: Record<string, number> = {};
     const config = riskManager.getConfig();
     const allPos = Object.values(portfolio);
     config.correlationGroups.forEach(g => {
         groups[g.id] = allPos.reduce((sum: number, p: Position) => g.symbols.includes(p.symbol) ? sum + p.marketValue : sum, 0);
     });
     return groups;
  }, [portfolio, riskManager]);

  return (
    <div className="h-screen w-full bg-surface-950 text-text-primary flex flex-col overflow-hidden font-sans selection:bg-brand-blue/30">
      <ConnectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        profiles={profiles}
        onConnect={(p) => setCurrentProfile(p)}
        onSaveProfile={(p) => setProfiles([...profiles, p])}
        onDeleteProfile={(id) => setProfiles(profiles.filter(p => p.id !== id))}
      />

      {/* Pro Header */}
      <header className="h-14 border-b border-surface-800 bg-surface-900/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-brand-blue to-indigo-600 w-8 h-8 rounded-md flex items-center justify-center shadow-lg shadow-brand-blue/20">
             <Activity className="text-white" size={18} />
          </div>
          <div>
             <h1 className="font-bold text-lg tracking-tight leading-none">Alpha_Bharat <span className="text-brand-blue">Pro</span></h1>
             <span className="text-[10px] font-mono text-text-secondary tracking-wider">HFT EXECUTION TERMINAL v3.0</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2.5 bg-surface-950 border border-surface-800 rounded-md px-3 py-1.5 hover:border-brand-blue/50 hover:bg-surface-900 transition-all group"
            >
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></div>
                <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">{currentProfile.name}</span>
                <Settings size={12} className="text-text-muted group-hover:text-brand-blue transition-colors" />
            </button>

            <div className="h-8 w-px bg-surface-800"></div>

            <div className="flex items-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-2 text-text-secondary">
                    <Server size={14} /> 
                    <span>{currentProfile.type === 'PRESET' ? 'TYO-EQ1' : 'NET-GW2'}</span>
                </div>
                <div className={`flex items-center gap-2 px-2 py-1 rounded ${isConnected ? 'bg-trade-up/10 text-trade-up' : 'bg-trade-down/10 text-trade-down'}`}>
                    {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span className="font-bold">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
            </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-12 gap-4 p-4 min-h-0 bg-[#09090b]">
        
        {/* Column 1: Metrics & Controls (3 cols) */}
        <div className="col-span-12 lg:col-span-3 row-span-12 flex flex-col gap-4 min-h-0">
          <div className="grid grid-cols-1 gap-3 shrink-0">
            <MetricCard 
              title="Session PnL" 
              value={`$${totalPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
              trend={totalPnL >= 0 ? 'up' : 'down'}
              icon={<DollarSign size={16} />}
            />
             <MetricCard 
              title="Network Latency" 
              value={currentProfile.providerId === 'SIMULATION' ? "12 µs" : "45 ms"} 
              subValue={currentProfile.providerId === 'SIMULATION' ? "DMA LOOPBACK" : "AWS DIRECT CONNECT"}
              trend="neutral"
              icon={<Zap size={16} />}
            />
          </div>
          
          <div className="shrink-0 h-72">
             <RiskStatus 
                config={riskManager.getConfig()} 
                currentExposure={currentPosition.marketValue}
                globalPnL={totalPnL}
                groupExposures={groupExposures}
             />
          </div>

          <div className="flex-1 min-h-0">
            <StrategyControl 
              strategies={strategies} 
              onToggleStatus={handleStrategyToggle}
              onAnalyze={handleCodeOptimization}
            />
          </div>
        </div>

        {/* Column 2: Visualization (6 cols) */}
        <div className="col-span-12 lg:col-span-6 row-span-12 flex flex-col gap-4 min-h-0">
          <div className="flex-[3] min-h-0 shadow-xl shadow-black/50 rounded-lg">
            <ChartWidget 
               data={ticks} 
               symbol={DEFAULT_SYMBOL} 
               orderBook={orderBook}
            />
          </div>
          
          <div className="flex-1 bg-surface-900 border border-surface-800 rounded-lg p-4 flex flex-col min-h-0 shadow-sm">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-text-primary">
                <BrainCircuit size={16} className="text-purple-500" /> Gemini Intelligence
              </h3>
              <button 
                onClick={handleAiAnalysis} 
                disabled={isAnalyzing}
                className={`text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all ${isAnalyzing ? 'bg-surface-800 text-text-muted' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'}`}
              >
                {isAnalyzing ? 'Processing...' : <><Send size={12} /> Generate Insight</>}
              </button>
            </div>
            <div className="flex-1 bg-surface-950 rounded-md p-3 border border-surface-800 overflow-y-auto font-mono text-xs text-text-secondary">
              {aiAnalysis ? (
                <p className="leading-relaxed text-text-primary">{aiAnalysis}</p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                   <BrainCircuit size={24} className="opacity-20" />
                   <span>AI Market Analysis Idle</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Execution & Logs (3 cols) */}
        <div className="col-span-12 lg:col-span-3 row-span-12 flex flex-col gap-4 min-h-0">
          {/* Order Entry */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 shrink-0 shadow-sm">
            <h3 className="font-semibold text-sm text-text-primary mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-text-secondary" /> Execution Gateway
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                 <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-text-muted">Sym</span>
                    <input type="text" value={DEFAULT_SYMBOL} disabled className="w-full bg-surface-950 border border-surface-800 rounded-md px-3 pt-5 pb-1.5 text-sm font-mono text-text-primary font-bold opacity-70" />
                 </div>
                 <div className="relative group">
                     <span className="absolute left-3 top-2 text-xs text-text-muted group-focus-within:text-brand-blue transition-colors">Size (Lots)</span>
                     <input 
                        type="number" 
                        value={orderQty} 
                        onChange={(e) => setOrderQty(e.target.value)}
                        className="w-full bg-surface-950 border border-surface-800 rounded-md px-3 pt-5 pb-1.5 text-sm font-mono text-white focus:border-brand-blue outline-none transition-colors" 
                     />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => handleOrder(Side.BUY)} 
                    disabled={!isConnected} 
                    className="bg-trade-up text-white font-bold py-3 rounded-md text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-trade-up/20 disabled:opacity-50 disabled:shadow-none"
                >
                    BUY MKT
                </button>
                <button 
                    onClick={() => handleOrder(Side.SELL)} 
                    disabled={!isConnected} 
                    className="bg-trade-down text-white font-bold py-3 rounded-md text-sm hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-trade-down/20 disabled:opacity-50 disabled:shadow-none"
                >
                    SELL MKT
                </button>
              </div>
               
               <div className="bg-surface-950 rounded-md p-3 border border-surface-800 mt-2">
                  <div className="flex flex-col gap-2 text-[10px] text-text-secondary font-mono">
                    <div className="flex justify-between items-center">
                        <span>Current Position</span>
                        <span className={`font-bold text-xs ${currentPosition.quantity !== 0 ? 'text-brand-blue' : 'text-text-muted'}`}>{currentPosition.quantity.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Avg Entry</span>
                        <span>${currentPosition.averagePrice.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-px bg-surface-800 my-0.5"></div>
                    <div className="flex justify-between items-center">
                        <span>Notional Value</span>
                        <span className="text-text-primary">${(currentPosition.marketValue).toLocaleString()}</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
            <LogPanel logs={logs} />
          </div>
        </div>

      </div>
    </div>
  );
}
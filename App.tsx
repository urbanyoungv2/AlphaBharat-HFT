
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tick, Strategy, StrategyStatus, LogEntry, Order, Position, Side, OrderType, ExchangeProfile } from './types';
import { ChartWidget } from './components/ChartWidget';
import { StrategyControl } from './components/StrategyControl';
import { LogPanel } from './components/LogPanel';
import { MetricCard } from './components/MetricCard';
import { RiskStatus } from './components/RiskStatus';
import { ConnectionModal } from './components/ConnectionModal';
import { analyzeMarketSentiment, optimizeStrategyCode } from './services/geminiService';
import { RiskManager, runRiskTests, RiskConfig } from './services/RiskManager';
import { ExchangeFactory, IExchange } from './services/ExchangeService';
import { Activity, Server, ShieldCheck, BrainCircuit, Send, Globe, Wifi, WifiOff, Settings } from 'lucide-react';

// Initial Constants
const DEFAULT_SYMBOL = "BTCUSDT"; 

// Enhanced Risk Config with Correlation Groups
const INITIAL_RISK_CONFIG: RiskConfig = {
  maxPositionSizeUSD: 2000000, // Max per single instrument
  maxDailyLossPerStrategy: 50000,
  maxGlobalDailyLoss: 100000,
  maxOrderValue: 500000,
  restrictedSymbols: ['LUNA', 'FTT'],
  correlationGroups: [
    { id: 'CRYPTO_L1', name: 'L1 Crypto (BTC/ETH)', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], maxExposureUSD: 3000000 },
    { id: 'STABLE', name: 'Stablecoins', symbols: ['USDC', 'USDT'], maxExposureUSD: 5000000 }
  ]
};

const DEFAULT_PROFILES: ExchangeProfile[] = [
    { id: 'p1', name: 'Internal Simulator', type: 'PRESET', providerId: 'SIMULATION' },
    { id: 'p2', name: 'Binance Spot (Live)', type: 'PRESET', providerId: 'BINANCE' },
    { id: 'p3', name: 'Coinbase Pro (Live)', type: 'PRESET', providerId: 'COINBASE' }
];

export default function App() {
  // --- State ---
  const [profiles, setProfiles] = useState<ExchangeProfile[]>(DEFAULT_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<ExchangeProfile>(DEFAULT_PROFILES[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [ticks, setTicks] = useState<Tick[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([
    { id: 'ST-001', name: 'MarketMaker_L1', language: 'Rust', status: StrategyStatus.RUNNING, pnl: 12450.50, latency: 12, memoryUsage: 64 },
    { id: 'ST-002', name: 'Arb_Tri_05', language: 'C++', status: StrategyStatus.PAUSED, pnl: 4320.10, latency: 45, memoryUsage: 128 },
    { id: 'ST-003', name: 'Momentum_Alpha', language: 'Python', status: StrategyStatus.STOPPED, pnl: -120.00, latency: 850, memoryUsage: 512 },
  ]);
  
  // Portfolio State (Multi-Asset)
  // Initialized with a hidden ETH position to demonstrate correlation checks
  const [portfolio, setPortfolio] = useState<Record<string, Position>>({
      'ETHUSDT': { symbol: 'ETHUSDT', quantity: 150, averagePrice: 3200, marketValue: 480000 },
      [DEFAULT_SYMBOL]: { symbol: DEFAULT_SYMBOL, quantity: 0, averagePrice: 0, marketValue: 0 }
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orderQty, setOrderQty] = useState<string>("0.01");
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const exchangeRef = useRef<IExchange>(ExchangeFactory.create(DEFAULT_PROFILES[0]));
  const riskManager = useMemo(() => new RiskManager(INITIAL_RISK_CONFIG), []);

  // --- Helpers ---
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

  // --- Initialization & Exchange Logic ---
  
  useEffect(() => {
    const testResults = runRiskTests();
    testResults.forEach(res => {
      const level = res.startsWith('FAIL') ? 'ERROR' : 'INFO';
      addLog(level, 'RiskTest', res);
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
      
      addLog('INFO', 'System', `Initializing connection to ${currentProfile.name}...`);

      newExchange.subscribeToTicker((tick) => {
        setTicks(prev => {
          const newHistory = [...prev, tick];
          return newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
        });

        // Update real-time market value for the active symbol
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

        // Simulate Strategy PnL drift
        setStrategies(prev => prev.map(s => {
          if (s.status === StrategyStatus.RUNNING) {
             const pnlChange = (Math.random() - 0.45) * 2;
             const newPnl = s.pnl + pnlChange;
             return { ...s, pnl: newPnl };
          }
          return s;
        }));
      });

      try {
        await newExchange.connect(DEFAULT_SYMBOL);
        setIsConnected(true);
        addLog('INFO', 'System', `Successfully connected to ${currentProfile.name}`);
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

  // --- Handlers ---

  const handleStrategyToggle = (id: string, status: StrategyStatus) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    addLog('INFO', 'StrategyEngine', `Strategy ${id} transitioned to ${status}`);
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    addLog('INFO', 'GeminiAI', 'Requesting market sentiment analysis...');
    const result = await analyzeMarketSentiment(ticks, DEFAULT_SYMBOL);
    setAiAnalysis(result);
    setIsAnalyzing(false);
    addLog('INFO', 'GeminiAI', 'Analysis complete.');
  };

  const handleCodeOptimization = async (strategy: Strategy) => {
    addLog('INFO', 'GeminiAI', `Analyzing source code for ${strategy.name}...`);
    const mockCode = strategy.language === 'Rust' 
      ? "fn calculate_signal(price: f64) -> bool { let threshold = 0.5; price > threshold }" 
      : "def calculate_signal(price): return price > 0.5";
    
    const result = await optimizeStrategyCode(strategy.name, mockCode);
    alert(`Optimization Suggestion for ${strategy.name}:\n\n${result}`);
  };

  const handleOrder = async (side: Side) => {
    if (!isConnected) {
        addLog('ERROR', 'OrderGateway', 'Cannot place order: Exchange Disconnected');
        return;
    }

    const qty = parseFloat(orderQty);
    if (isNaN(qty) || qty <= 0) {
        addLog('WARN', 'OrderGateway', 'Invalid quantity');
        return;
    }

    const currentPrice = ticks.length > 0 ? ticks[ticks.length - 1].price : 0;
    const totalPnL = strategies.reduce((acc, s) => acc + s.pnl, 0);
    const allPositions = Object.values(portfolio);

    const riskResult = riskManager.validateOrder(
        DEFAULT_SYMBOL,
        side,
        currentPrice,
        qty,
        allPositions,
        null, 
        totalPnL
    );

    if (!riskResult.allowed) {
        addLog('ERROR', 'RiskManager', `Order Blocked: ${riskResult.reason}`);
        return;
    }

    addLog('INFO', 'OrderGateway', `Sending ${side} ${qty} ${DEFAULT_SYMBOL} to ${currentProfile.name}...`);
    
    try {
        const filledOrder = await exchangeRef.current.executeOrder(
            DEFAULT_SYMBOL, 
            side, 
            qty, 
            currentPrice, 
            OrderType.LIMIT
        );

        // Update Portfolio State
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

        addLog('INFO', 'OrderGateway', `FILL CONFIRMED: ${side} ${qty} @ ${filledOrder.price}`);
    } catch (err) {
        addLog('ERROR', 'OrderGateway', `Order Rejected: ${err}`);
    }
  };

  // Derived State
  const totalPnL = strategies.reduce((acc, s) => acc + s.pnl, 0);
  const lastPrice = ticks.length > 0 ? ticks[ticks.length - 1].price : 0;
  const currentPosition = portfolio[DEFAULT_SYMBOL];

  // Calculate group exposures for UI
  const groupExposures = useMemo(() => {
     const groups: Record<string, number> = {};
     const config = riskManager.getConfig();
     const allPos = Object.values(portfolio);
     
     config.correlationGroups.forEach(g => {
         const exposure = allPos.reduce((sum, p) => {
             return g.symbols.includes(p.symbol) ? sum + p.marketValue : sum;
         }, 0);
         groups[g.id] = exposure;
     });
     return groups;
  }, [portfolio, riskManager]);

  return (
    <div className="h-screen w-screen bg-terminal-dark text-terminal-text flex flex-col overflow-hidden">
      <ConnectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        profiles={profiles}
        onConnect={(p) => setCurrentProfile(p)}
        onSaveProfile={(p) => setProfiles([...profiles, p])}
        onDeleteProfile={(id) => setProfiles(profiles.filter(p => p.id !== id))}
      />

      {/* Header */}
      <header className="h-12 border-b border-terminal-border bg-terminal-bg flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-terminal-green" />
          <h1 className="font-bold text-lg tracking-tight">ALPHA_BHARAT <span className="text-xs font-mono text-gray-500">v2.7.1-RISK-CORE</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-terminal-dark border border-terminal-border rounded px-3 py-1 hover:border-terminal-blue transition-colors"
            >
                <Globe size={14} className="text-terminal-blue" />
                <span className="text-xs font-bold text-gray-300">{currentProfile.name}</span>
                <Settings size={12} className="text-gray-500" />
            </button>

            <div className="flex items-center gap-6 text-xs font-mono text-gray-400">
                <div className="flex items-center gap-1">
                    <Server size={14} /> {currentProfile.type === 'PRESET' ? 'AWS-Tokyo' : 'Direct-Connect'}
                </div>
                <div className="flex items-center gap-1">
                    {isConnected ? <Wifi size={14} className="text-terminal-green"/> : <WifiOff size={14} className="text-terminal-red"/>}
                    <span className={isConnected ? 'text-terminal-green' : 'text-terminal-red'}>
                        {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
            </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-12 gap-2 p-2 min-h-0">
        
        {/* Left Col: Strategy & Metrics */}
        <div className="col-span-3 row-span-12 flex flex-col gap-2 min-h-0">
          <div className="grid grid-cols-1 gap-2 shrink-0">
            <MetricCard 
              title="Total PnL (Session)" 
              value={`$${totalPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
              trend={totalPnL >= 0 ? 'up' : 'down'}
              color={totalPnL >= 0 ? '#2ea043' : '#da3633'}
            />
             <MetricCard 
              title="Active Latency" 
              value={currentProfile.providerId === 'SIMULATION' ? "12 µs" : "45 ms"} 
              subValue={currentProfile.providerId === 'SIMULATION' ? "NIC -> Kernel -> App" : "WebSocket RTT"}
            />
          </div>
          
          <div className="shrink-0 h-56">
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

        {/* Middle Col: Charts & AI */}
        <div className="col-span-6 row-span-12 flex flex-col gap-2 min-h-0">
          <div className="flex-[2] min-h-0">
            <ChartWidget data={ticks} symbol={DEFAULT_SYMBOL} />
          </div>
          
          <div className="flex-1 bg-terminal-dark border border-terminal-border rounded p-3 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2 text-terminal-blue">
                <BrainCircuit size={16} /> Gemini Market Intelligence
              </h3>
              <button 
                onClick={handleAiAnalysis} 
                disabled={isAnalyzing}
                className={`text-xs px-3 py-1 rounded font-bold flex items-center gap-1 ${isAnalyzing ? 'bg-gray-700 text-gray-500' : 'bg-terminal-blue text-black hover:bg-blue-400'}`}
              >
                {isAnalyzing ? 'Thinking...' : <><Send size={12} /> Analyze Trend</>}
              </button>
            </div>
            <div className="flex-1 bg-[#010409] rounded p-2 border border-terminal-border overflow-y-auto font-mono text-xs text-gray-300">
              {aiAnalysis ? (
                <p className="leading-relaxed">{aiAnalysis}</p>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 italic">
                  No analysis generated. Click "Analyze Trend" to prompt Gemini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Order Entry & Logs */}
        <div className="col-span-3 row-span-12 flex flex-col gap-2 min-h-0">
          <div className="bg-terminal-dark border border-terminal-border rounded p-3 shrink-0">
            <h3 className="font-bold text-sm text-gray-300 mb-3 flex items-center gap-2">
              <ShieldCheck size={16} /> Order Gateway
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                 <input type="text" value={DEFAULT_SYMBOL} disabled className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-gray-400" />
                 <input 
                    type="number" 
                    value={orderQty} 
                    onChange={(e) => setOrderQty(e.target.value)}
                    placeholder="Qty" 
                    className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-white focus:border-terminal-blue outline-none" 
                 />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleOrder(Side.BUY)} disabled={!isConnected} className="bg-terminal-green disabled:opacity-50 text-white font-bold py-2 rounded text-sm hover:opacity-90 transition">BUY</button>
                <button onClick={() => handleOrder(Side.SELL)} disabled={!isConnected} className="bg-terminal-red disabled:opacity-50 text-white font-bold py-2 rounded text-sm hover:opacity-90 transition">SELL</button>
              </div>
               <div className="flex flex-col gap-1 text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-gray-800">
                 <div className="flex justify-between">
                    <span>Pos: {currentPosition.quantity.toFixed(4)}</span>
                    <span>Val: ${(currentPosition.marketValue).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Avg Px: ${currentPosition.averagePrice.toFixed(2)}</span>
                    <span>Last: ${lastPrice.toFixed(2)}</span>
                 </div>
                 {/* Debug view of hidden portfolio */}
                 <div className="mt-2 pt-1 border-t border-gray-800 text-gray-600">
                    <div className="flex justify-between">
                        <span>Total Crypto Exp:</span>
                        <span>${(groupExposures['CRYPTO_L1'] || 0).toLocaleString()}</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            <LogPanel logs={logs} />
          </div>
        </div>

      </div>
    </div>
  );
}

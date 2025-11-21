import React from 'react';
import { Strategy, StrategyStatus } from '../types';
import { Play, Pause, Square, Upload, Cpu, Zap, Activity } from 'lucide-react';

interface StrategyControlProps {
  strategies: Strategy[];
  onToggleStatus: (id: string, status: StrategyStatus) => void;
  onAnalyze: (strategy: Strategy) => void;
}

export const StrategyControl: React.FC<StrategyControlProps> = ({ strategies, onToggleStatus, onAnalyze }) => {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-lg h-full flex flex-col overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-surface-800 flex justify-between items-center bg-surface-900/50 backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
          <Cpu size={16} className="text-brand-blue" /> Strategy Engine
        </h3>
        <button className="text-xs font-medium bg-surface-800 hover:bg-surface-700 text-text-primary px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 border border-surface-700">
          <Upload size={12} />
          <span className="hidden sm:inline">Hot Reload</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {strategies.map(strategy => (
          <div key={strategy.id} className="group bg-surface-950 border border-surface-800 hover:border-surface-700 rounded-md p-3 transition-all shadow-sm">
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-8 rounded-full ${
                   strategy.status === StrategyStatus.RUNNING ? 'bg-trade-up shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                   strategy.status === StrategyStatus.PAUSED ? 'bg-trade-warn' :
                   'bg-trade-down'
                }`}></div>
                <div>
                  <div className="font-medium text-sm text-text-primary tracking-tight">{strategy.name}</div>
                  <div className="text-xs text-text-muted font-mono mt-0.5 flex items-center gap-2">
                    <span>{strategy.language}</span>
                    <span className="w-1 h-1 bg-surface-700 rounded-full"></span>
                    <span>{strategy.id}</span>
                  </div>
                </div>
              </div>
              <div className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${
                strategy.status === StrategyStatus.RUNNING ? 'border-trade-up/20 text-trade-up bg-trade-up/5' :
                strategy.status === StrategyStatus.PAUSED ? 'border-trade-warn/20 text-trade-warn bg-trade-warn/5' :
                'border-trade-down/20 text-trade-down bg-trade-down/5'
              }`}>
                {strategy.status}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-2 mb-3 bg-surface-900/50 rounded p-2 border border-surface-800/50">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase">Latency</span>
                <span className={`text-xs font-mono font-medium ${strategy.latency < 50 ? "text-trade-up" : "text-trade-warn"}`}>
                  {strategy.latency} µs
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-text-muted uppercase">Session PnL</span>
                <span className={`text-xs font-mono font-medium ${strategy.pnl >= 0 ? "text-trade-up" : "text-trade-down"}`}>
                  ${strategy.pnl.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex gap-2 pt-1">
              {strategy.status !== StrategyStatus.RUNNING ? (
                <button 
                  onClick={() => onToggleStatus(strategy.id, StrategyStatus.RUNNING)}
                  className="flex-1 bg-trade-up/10 hover:bg-trade-up/20 text-trade-up border border-trade-up/20 text-xs font-medium py-1.5 rounded flex justify-center items-center gap-1.5 transition-colors"
                >
                  <Play size={12} fill="currentColor" /> Start
                </button>
              ) : (
                <button 
                  onClick={() => onToggleStatus(strategy.id, StrategyStatus.PAUSED)}
                  className="flex-1 bg-trade-warn/10 hover:bg-trade-warn/20 text-trade-warn border border-trade-warn/20 text-xs font-medium py-1.5 rounded flex justify-center items-center gap-1.5 transition-colors"
                >
                  <Pause size={12} fill="currentColor" /> Pause
                </button>
              )}
              
              <button 
                 onClick={() => onToggleStatus(strategy.id, StrategyStatus.STOPPED)}
                 className="flex-1 bg-surface-800 hover:bg-surface-700 text-text-secondary border border-surface-700 text-xs font-medium py-1.5 rounded flex justify-center items-center gap-1.5 transition-colors"
              >
                <Square size={12} fill="currentColor" /> Stop
              </button>
              
              <button
                onClick={() => onAnalyze(strategy)}
                className="bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/20 p-1.5 rounded transition-colors"
                title="AI Optimization"
              >
                <Zap size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
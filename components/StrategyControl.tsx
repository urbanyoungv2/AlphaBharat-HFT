import React, { useState } from 'react';
import { Strategy, StrategyStatus } from '../types';
import { Play, Pause, Square, Upload, Cpu, Zap } from 'lucide-react';

interface StrategyControlProps {
  strategies: Strategy[];
  onToggleStatus: (id: string, status: StrategyStatus) => void;
  onAnalyze: (strategy: Strategy) => void;
}

export const StrategyControl: React.FC<StrategyControlProps> = ({ strategies, onToggleStatus, onAnalyze }) => {
  return (
    <div className="bg-terminal-dark border border-terminal-border rounded h-full flex flex-col">
      <div className="p-3 border-b border-terminal-border flex justify-between items-center bg-terminal-bg">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Cpu size={16} /> Strategy Engine (WASM/Native)
        </h3>
        <button className="text-xs bg-terminal-blue text-black px-2 py-1 rounded hover:bg-blue-400 flex items-center gap-1">
          <Upload size={12} /> Hot Reload
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {strategies.map(strategy => (
          <div key={strategy.id} className="bg-[#161b22] border border-terminal-border rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-mono font-bold text-sm text-terminal-blue">{strategy.name}</div>
                <div className="text-xs text-gray-500">{strategy.language} • {strategy.id}</div>
              </div>
              <div className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                strategy.status === StrategyStatus.RUNNING ? 'border-terminal-green text-terminal-green bg-terminal-green/10' :
                strategy.status === StrategyStatus.PAUSED ? 'border-terminal-yellow text-terminal-yellow bg-terminal-yellow/10' :
                'border-terminal-red text-terminal-red bg-terminal-red/10'
              }`}>
                {strategy.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Latency</span>
                <span className={strategy.latency < 50 ? "text-terminal-green" : "text-terminal-yellow"}>{strategy.latency} µs</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>PnL</span>
                <span className={strategy.pnl >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                  ${strategy.pnl.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 border-t border-terminal-border pt-2">
              {strategy.status !== StrategyStatus.RUNNING && (
                <button 
                  onClick={() => onToggleStatus(strategy.id, StrategyStatus.RUNNING)}
                  className="flex-1 bg-terminal-green/20 hover:bg-terminal-green/30 text-terminal-green text-xs py-1 rounded flex justify-center items-center gap-1 border border-terminal-green/50"
                >
                  <Play size={12} /> Start
                </button>
              )}
              {strategy.status === StrategyStatus.RUNNING && (
                <button 
                  onClick={() => onToggleStatus(strategy.id, StrategyStatus.PAUSED)}
                  className="flex-1 bg-terminal-yellow/20 hover:bg-terminal-yellow/30 text-terminal-yellow text-xs py-1 rounded flex justify-center items-center gap-1 border border-terminal-yellow/50"
                >
                  <Pause size={12} /> Pause
                </button>
              )}
              <button 
                 onClick={() => onToggleStatus(strategy.id, StrategyStatus.STOPPED)}
                 className="flex-1 bg-terminal-red/20 hover:bg-terminal-red/30 text-terminal-red text-xs py-1 rounded flex justify-center items-center gap-1 border border-terminal-red/50"
              >
                <Square size={12} /> Stop
              </button>
              <button
                onClick={() => onAnalyze(strategy)}
                className="bg-terminal-border hover:bg-gray-700 text-gray-300 p-1 rounded"
                title="AI Code Analysis"
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

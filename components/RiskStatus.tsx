import React from 'react';
import { RiskConfig } from '../services/RiskManager';
import { ShieldCheck, AlertTriangle, PieChart, Lock } from 'lucide-react';

interface RiskStatusProps {
  config: RiskConfig;
  currentExposure: number;
  globalPnL: number;
  groupExposures?: Record<string, number>;
}

export const RiskStatus: React.FC<RiskStatusProps> = ({ config, currentExposure, globalPnL, groupExposures = {} }) => {
  const exposurePct = Math.min((currentExposure / config.maxPositionSizeUSD) * 100, 100);
  const globalLoss = Math.abs(Math.min(globalPnL, 0));
  const lossPct = Math.min((globalLoss / config.maxGlobalDailyLoss) * 100, 100);
  const isHalted = lossPct >= 100;

  return (
    <div className={`bg-surface-900 border ${isHalted ? 'border-trade-down/50' : 'border-surface-800'} rounded-lg p-4 flex flex-col gap-4 h-full shadow-sm transition-colors`}>
      <div className="flex justify-between items-center border-b border-surface-800 pb-3 shrink-0">
        <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
          {isHalted ? <AlertTriangle size={18} className="text-trade-down" /> : <ShieldCheck size={18} className="text-trade-up" />}
          Risk Engine
        </h3>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${isHalted ? 'bg-trade-down/20 text-trade-down border border-trade-down/30' : 'bg-trade-up/10 text-trade-up border border-trade-up/30'}`}>
          {isHalted ? <><Lock size={10} /> SYSTEM HALTED</> : 'MONITORING ACTIVE'}
        </div>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* Single Instrument Exposure */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs text-text-secondary">Position Limit</span>
            <span className="text-xs font-mono text-text-primary">${currentExposure.toLocaleString()} <span className="text-text-muted">/ ${config.maxPositionSizeUSD.toLocaleString()}</span></span>
          </div>
          <div className="h-2 w-full bg-surface-950 rounded-full overflow-hidden border border-surface-800">
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${exposurePct > 90 ? 'bg-trade-down' : exposurePct > 70 ? 'bg-trade-warn' : 'bg-brand-blue'}`} 
              style={{ width: `${exposurePct}%` }}
            />
          </div>
        </div>

        {/* Drawdown Limit */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs text-text-secondary">Daily Drawdown</span>
            <span className={`text-xs font-mono font-bold ${globalLoss > 0 ? 'text-trade-down' : 'text-text-muted'}`}>
               ${globalLoss.toLocaleString()} <span className="text-text-muted font-normal">/ ${config.maxGlobalDailyLoss.toLocaleString()}</span>
            </span>
          </div>
          <div className="h-2 w-full bg-surface-950 rounded-full overflow-hidden border border-surface-800">
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${lossPct >= 100 ? 'bg-trade-down' : lossPct > 75 ? 'bg-trade-warn' : 'bg-trade-up'}`} 
              style={{ width: `${lossPct}%` }}
            />
          </div>
        </div>
        
        {/* Correlation Groups */}
        {config.correlationGroups.length > 0 && (
          <div className="bg-surface-950 rounded-md p-3 border border-surface-800">
             <div className="flex items-center gap-2 text-text-muted mb-3">
                <PieChart size={12} /> <span className="uppercase text-[10px] font-bold tracking-wider">Sector Exposure</span>
             </div>
             <div className="space-y-3">
                {config.correlationGroups.map(group => {
                    const currentVal = groupExposures[group.id] || 0;
                    const pct = Math.min((currentVal / group.maxExposureUSD) * 100, 100);
                    return (
                        <div key={group.id}>
                            <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                                <span>{group.name}</span>
                                <span className="font-mono">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${pct > 90 ? 'bg-trade-down' : 'bg-purple-500'}`} 
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
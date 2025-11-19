
import React from 'react';
import { RiskConfig } from '../services/RiskManager';
import { ShieldCheck, AlertTriangle, PieChart } from 'lucide-react';

interface RiskStatusProps {
  config: RiskConfig;
  currentExposure: number; // Global exposure or single symbol? Let's assume main symbol for now, or sum.
  globalPnL: number;
  groupExposures?: Record<string, number>; // Map of group ID to current exposure
}

export const RiskStatus: React.FC<RiskStatusProps> = ({ config, currentExposure, globalPnL, groupExposures = {} }) => {
  const exposurePct = Math.min((currentExposure / config.maxPositionSizeUSD) * 100, 100);
  const globalLoss = Math.abs(Math.min(globalPnL, 0));
  const lossPct = Math.min((globalLoss / config.maxGlobalDailyLoss) * 100, 100);

  return (
    <div className="bg-terminal-dark border border-terminal-border rounded p-3 flex flex-col gap-3 h-full">
      <div className="flex justify-between items-center border-b border-terminal-border pb-2 shrink-0">
        <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
          {lossPct >= 100 ? <AlertTriangle size={16} className="text-terminal-red" /> : <ShieldCheck size={16} className="text-terminal-green" />}
          Risk Manager
        </h3>
        <div className={`text-[10px] font-mono px-2 py-0.5 rounded ${lossPct >= 100 ? 'bg-red-900 text-white' : 'bg-gray-800 text-gray-500'}`}>
          {lossPct >= 100 ? 'HALTED' : 'ACTIVE'}
        </div>
      </div>
      
      <div className="space-y-3 font-mono text-xs flex-1 overflow-y-auto pr-1">
        {/* Primary Instrument Exposure */}
        <div>
          <div className="flex justify-between text-gray-400 mb-1">
            <span>Active Symbol Exp.</span>
            <span>${currentExposure.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full bg-gray-800 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${exposurePct > 85 ? 'bg-terminal-red' : exposurePct > 60 ? 'bg-terminal-yellow' : 'bg-terminal-blue'}`} 
              style={{ width: `${exposurePct}%` }}
            />
          </div>
        </div>

        {/* Drawdown Bar */}
        <div>
          <div className="flex justify-between text-gray-400 mb-1">
            <span>Global Daily Loss</span>
            <span className={globalPnL < 0 ? 'text-terminal-red' : 'text-gray-300'}>
               -${globalLoss.toLocaleString()} / ${config.maxGlobalDailyLoss.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-800 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${lossPct >= 100 ? 'bg-terminal-red' : lossPct > 70 ? 'bg-terminal-yellow' : 'bg-terminal-green'}`} 
              style={{ width: `${lossPct}%` }}
            />
          </div>
        </div>
        
        {/* Correlation Groups */}
        {config.correlationGroups.length > 0 && (
          <div className="border-t border-gray-800 pt-2">
             <div className="flex items-center gap-1 text-gray-500 mb-2">
                <PieChart size={10} /> <span className="uppercase text-[10px]">Sector Usage</span>
             </div>
             {config.correlationGroups.map(group => {
                const currentVal = groupExposures[group.id] || 0;
                const pct = Math.min((currentVal / group.maxExposureUSD) * 100, 100);
                return (
                    <div key={group.id} className="mb-2">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>{group.name}</span>
                            <span>{pct.toFixed(1)}%</span>
                        </div>
                         <div className="h-1 w-full bg-gray-800 rounded overflow-hidden mt-0.5">
                            <div 
                                className={`h-full transition-all duration-500 ${pct > 90 ? 'bg-terminal-red' : 'bg-purple-500'}`} 
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
             })}
          </div>
        )}

        {/* Limits Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-gray-500">
            <div className="bg-[#0d1117] p-1.5 rounded border border-gray-800 flex flex-col">
                <span className="text-gray-600 uppercase">Max Order</span>
                <span className="text-gray-300">${config.maxOrderValue.toLocaleString()}</span>
            </div>
            <div className="bg-[#0d1117] p-1.5 rounded border border-gray-800 flex flex-col">
                <span className="text-gray-600 uppercase">Strat Limit</span>
                <span className="text-gray-300">${config.maxDailyLossPerStrategy.toLocaleString()}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

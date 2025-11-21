import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LogPanelProps {
  logs: LogEntry[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-lg h-full flex flex-col font-mono text-xs shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-800 bg-surface-950 flex items-center gap-2 text-text-secondary">
        <Terminal size={14} />
        <span className="font-semibold uppercase tracking-wider text-[10px]">System Audit Log</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 bg-[#0c0c0e]">
        {logs.map(log => (
          <div key={log.id} className="flex gap-3 hover:bg-surface-800/50 p-1 rounded-sm transition-colors group">
            <span className="text-surface-700 select-none w-16 shrink-0 group-hover:text-text-muted transition-colors">
              {new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}
            </span>
            <span className={`font-bold w-10 shrink-0 ${
              log.level === 'INFO' ? 'text-brand-blue' :
              log.level === 'WARN' ? 'text-trade-warn' :
              log.level === 'ERROR' ? 'text-trade-down' : 'text-text-muted'
            }`}>
              {log.level}
            </span>
            <span className="text-text-secondary w-24 shrink-0 opacity-80">
              [{log.component}]
            </span>
            <span className="text-text-primary break-all font-medium opacity-90">
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
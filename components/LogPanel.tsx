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
    <div className="bg-terminal-dark border border-terminal-border rounded h-full flex flex-col font-mono text-xs">
      <div className="px-3 py-2 border-b border-terminal-border bg-terminal-bg flex items-center gap-2">
        <Terminal size={14} />
        <span className="font-bold text-gray-300">System Logs / Audit Trail</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.map(log => (
          <div key={log.id} className="flex gap-2 hover:bg-gray-800/50 p-0.5 rounded">
            <span className="text-gray-500 select-none">
              {new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}
            </span>
            <span className={`font-bold w-12 ${
              log.level === 'INFO' ? 'text-terminal-blue' :
              log.level === 'WARN' ? 'text-terminal-yellow' :
              log.level === 'ERROR' ? 'text-terminal-red' : 'text-gray-400'
            }`}>
              [{log.level}]
            </span>
            <span className="text-terminal-blue w-20 opacity-75">
              {log.component}
            </span>
            <span className="text-gray-300 break-all">
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

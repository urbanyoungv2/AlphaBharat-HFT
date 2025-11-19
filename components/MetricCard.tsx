import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  subValue?: string;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, subValue, color }) => {
  const trendColor = trend === 'up' ? 'text-terminal-green' : trend === 'down' ? 'text-terminal-red' : 'text-terminal-text';
  const borderColor = color ? `border-[${color}]` : 'border-terminal-border';

  return (
    <div className={`bg-terminal-dark border ${borderColor} border-opacity-50 p-4 rounded shadow-sm`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-2xl font-mono font-bold ${trendColor}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-gray-400 mt-2 font-mono">
          {subValue}
        </div>
      )}
    </div>
  );
};

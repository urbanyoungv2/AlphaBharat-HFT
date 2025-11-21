import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  subValue?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, subValue, icon }) => {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 flex items-start justify-between shadow-sm hover:border-surface-700 transition-colors group">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</span>
        <div className="text-2xl font-mono font-medium text-text-primary tracking-tight mt-1">
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-text-muted font-mono mt-1">
            {subValue}
          </div>
        )}
      </div>
      
      <div className={`
        w-8 h-8 rounded-md flex items-center justify-center bg-surface-800
        ${trend === 'up' ? 'text-trade-up bg-trade-up/10' : ''}
        ${trend === 'down' ? 'text-trade-down bg-trade-down/10' : ''}
        ${trend === 'neutral' ? 'text-text-secondary' : ''}
      `}>
        {icon ? icon : (
          trend === 'up' ? <TrendingUp size={16} /> :
          trend === 'down' ? <TrendingDown size={16} /> :
          <Minus size={16} />
        )}
      </div>
    </div>
  );
};
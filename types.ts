
export enum Side {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  IOC = 'IOC'
}

export enum StrategyStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

export interface Tick {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
}

export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  price: number;
  quantity: number;
  type: OrderType;
  status: OrderStatus;
  timestamp: number;
}

export interface Strategy {
  id: string;
  name: string;
  language: 'Rust' | 'Python' | 'C++';
  status: StrategyStatus;
  pnl: number;
  latency: number; // in microseconds
  memoryUsage: number; // in MB
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;
  message: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
}

export interface ExchangeProfile {
  id: string;
  name: string;
  type: 'PRESET' | 'CUSTOM';
  providerId?: 'BINANCE' | 'COINBASE' | 'SIMULATION';
  wsUrl?: string;
  subscriptionMessage?: string; // JSON string to send on connect
  apiKey?: string;
}

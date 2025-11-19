
import { Tick } from '../types';

export type TimeFrame = '1H' | '4H' | '1D' | '1W' | 'CUSTOM';

export interface HistoricalPoint {
  timestamp: number;
  price: number;
  volume: number;
}

export const HistoryService = {
  /**
   * Simulates fetching historical data from an API (e.g., TimescaleDB or InfluxDB)
   */
  fetchHistory: async (symbol: string, range: TimeFrame, startDate?: Date, endDate?: Date): Promise<HistoricalPoint[]> => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 600));

    const now = new Date();
    let start = startDate || new Date();
    let end = endDate || now;
    let points = 100; // Number of data points to generate
    let volatility = 0.02;

    // Determine constraints based on TimeFrame
    switch (range) {
      case '1H':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        points = 60; // 1 min resolution
        volatility = 0.005;
        break;
      case '4H':
        start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        points = 120; // 2 min resolution
        volatility = 0.01;
        break;
      case '1D':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        points = 144; // 10 min resolution
        volatility = 0.03;
        break;
      case '1W':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        points = 168; // Hourly resolution
        volatility = 0.08;
        break;
      case 'CUSTOM':
        // Use provided start/end
        if (!startDate) start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        points = Math.min(Math.max(Math.floor(diffHours * 10), 50), 500); // Dynamic resolution
        volatility = 0.05;
        break;
    }

    return generateMockPath(start, end, points, 64000, volatility);
  }
};

/**
 * Generates a random walk price path
 */
function generateMockPath(start: Date, end: Date, steps: number, startPrice: number, volatility: number): HistoricalPoint[] {
  const data: HistoricalPoint[] = [];
  let currentPrice = startPrice * (1 + (Math.random() - 0.5) * volatility);
  const timeStep = (end.getTime() - start.getTime()) / steps;

  for (let i = 0; i < steps; i++) {
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice += change;
    
    // Add some trend bias occasionally
    if (i % 20 === 0) {
        currentPrice *= (1 + (Math.random() - 0.45) * 0.01);
    }

    data.push({
      timestamp: start.getTime() + (i * timeStep),
      price: Math.abs(currentPrice),
      volume: Math.random() * 10
    });
  }
  
  return data;
}

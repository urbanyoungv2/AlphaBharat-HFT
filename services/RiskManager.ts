
import { Position, Side, Strategy } from '../types';

export interface CorrelationGroup {
  id: string;
  name: string;
  symbols: string[];
  maxExposureUSD: number;
}

export interface RiskConfig {
  maxPositionSizeUSD: number;       // Max limit for a single instrument
  maxDailyLossPerStrategy: number;
  maxGlobalDailyLoss: number;
  maxOrderValue: number;
  restrictedSymbols: string[];
  correlationGroups: CorrelationGroup[]; // New: Correlation checks
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

export class RiskManager {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  public getConfig(): RiskConfig {
    return this.config;
  }

  public setConfig(config: RiskConfig) {
    this.config = config;
  }

  public validateOrder(
    symbol: string,
    side: Side,
    price: number,
    quantity: number,
    allPositions: Position[], // Now takes full portfolio
    strategy: Strategy | null, 
    globalDailyPnL: number
  ): RiskCheckResult {
    const orderValue = price * quantity;

    // 1. Restricted Symbols Check
    if (this.config.restrictedSymbols.includes(symbol)) {
      return { allowed: false, reason: `Risk: Symbol ${symbol} is restricted.` };
    }

    // 2. Max Order Value Check
    if (orderValue > this.config.maxOrderValue) {
      return { allowed: false, reason: `Risk: Order value $${orderValue.toLocaleString()} exceeds limit $${this.config.maxOrderValue.toLocaleString()}.` };
    }

    // 3. Global Daily Loss Check
    if (globalDailyPnL <= -this.config.maxGlobalDailyLoss) {
      return { allowed: false, reason: `Risk: Global daily loss limit reached ($${this.config.maxGlobalDailyLoss.toLocaleString()}). Trading halted.` };
    }

    // 4. Strategy Daily Loss Check
    if (strategy && strategy.pnl <= -this.config.maxDailyLossPerStrategy) {
      return { allowed: false, reason: `Risk: Strategy ${strategy.name} hit daily loss limit ($${this.config.maxDailyLossPerStrategy.toLocaleString()}).` };
    }

    // 5. Max Position Size (Single Instrument) Check
    const currentPos = allPositions.find(p => p.symbol === symbol);
    let currentQty = currentPos ? currentPos.quantity : 0;
    let newQty = currentQty;
    
    if (side === Side.BUY) {
      newQty += quantity;
    } else {
      newQty -= quantity;
    }

    const projectedExposure = Math.abs(newQty * price);
    if (projectedExposure > this.config.maxPositionSizeUSD) {
      return { allowed: false, reason: `Risk: Projected ${symbol} position $${projectedExposure.toLocaleString()} exceeds limit $${this.config.maxPositionSizeUSD.toLocaleString()}.` };
    }

    // 6. Correlation / Sector Exposure Check
    // Find if this symbol belongs to any correlation group
    const group = this.config.correlationGroups.find(g => g.symbols.includes(symbol));
    if (group) {
      // Calculate current exposure of this group from ALL positions
      const groupExposure = allPositions.reduce((acc, pos) => {
        if (group.symbols.includes(pos.symbol)) {
           // If it's the symbol we are trading, use the NEW projected exposure
           // If it's another symbol in the group, use its CURRENT market value
           if (pos.symbol === symbol) {
             return acc; // We add the projected exposure separately below to avoid double counting or stale price issues
           }
           return acc + pos.marketValue;
        }
        return acc;
      }, 0);

      // Add the projected exposure of the active order
      const totalGroupExposure = groupExposure + projectedExposure;

      if (totalGroupExposure > group.maxExposureUSD) {
        return { 
          allowed: false, 
          reason: `Risk: Correlation Limit Breached. Group '${group.name}' exposure would be $${totalGroupExposure.toLocaleString()} (Limit: $${group.maxExposureUSD.toLocaleString()}).` 
        };
      }
    }

    return { allowed: true };
  }
}

// Enhanced Unit Tests
export const runRiskTests = (): string[] => {
  const results: string[] = [];
  const config: RiskConfig = {
    maxPositionSizeUSD: 100000,
    maxDailyLossPerStrategy: 5000,
    maxGlobalDailyLoss: 10000,
    maxOrderValue: 50000,
    restrictedSymbols: ['SCAM'],
    correlationGroups: [
      { id: 'CRYPTO', name: 'Crypto Assets', symbols: ['BTC', 'ETH', 'SOL'], maxExposureUSD: 150000 }
    ]
  };
  
  const rm = new RiskManager(config);

  // 1. Order Value
  const res1 = rm.validateOrder('BTC', Side.BUY, 60000, 1, [], null, 0);
  results.push(!res1.allowed && res1.reason?.includes('Order value') ? "PASS: Max Order Value" : `FAIL: Max Order Value (${res1.reason})`);

  // 2. Restricted
  const res2 = rm.validateOrder('SCAM', Side.BUY, 10, 100, [], null, 0);
  results.push(!res2.allowed && res2.reason?.includes('restricted') ? "PASS: Restricted Symbol" : "FAIL: Restricted Symbol");

  // 3. Single Position Limit
  const mockPosBTC = { symbol: 'BTC', quantity: 1.5, averagePrice: 60000, marketValue: 90000 };
  const res3 = rm.validateOrder('BTC', Side.BUY, 60000, 0.5, [mockPosBTC], null, 0); // 90k + 30k = 120k > 100k
  results.push(!res3.allowed && res3.reason?.includes('Projected BTC position') ? "PASS: Single Position Limit" : "FAIL: Single Position Limit");

  // 4. Correlation Limit
  // Setup: We hold $100k worth of ETH. Limit for 'Crypto' group is $150k.
  // We try to buy $60k worth of BTC. Total would be $160k > $150k.
  const mockPosETH = { symbol: 'ETH', quantity: 40, averagePrice: 2500, marketValue: 100000 };
  const res4 = rm.validateOrder('BTC', Side.BUY, 60000, 1, [mockPosETH], null, 0);
  
  if (!res4.allowed && res4.reason?.includes('Correlation Limit Breached')) {
    results.push("PASS: Correlation Group Limit");
  } else {
    results.push(`FAIL: Correlation Group Limit (Reason: ${res4.reason || 'Allowed'})`);
  }

  return results;
};

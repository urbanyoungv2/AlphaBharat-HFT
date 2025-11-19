
import { Tick, Order, Side, OrderType, ExchangeProfile } from '../types';

// Unified Interface for all Exchange Adapters
export interface IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  
  connect(symbol: string): Promise<void>;
  disconnect(): void;
  
  // Market Data
  subscribeToTicker(callback: (tick: Tick) => void): void;
  
  // Order Management
  executeOrder(symbol: string, side: Side, quantity: number, price: number, type: OrderType): Promise<Order>;
}

// --------------------------------------------------------------------------
// 1. Simulation Adapter (Random Walk)
// --------------------------------------------------------------------------
export class SimulationAdapter implements IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  
  private intervalId: any = null;
  private currentPrice = 64000;
  private tickCallback: ((tick: Tick) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    this.status = 'CONNECTED';
    if (this.intervalId) clearInterval(this.intervalId);
    
    this.intervalId = setInterval(() => {
      if (!this.tickCallback) return;

      const change = (Math.random() - 0.5) * 50;
      this.currentPrice += change;
      
      const tick: Tick = {
        symbol: symbol,
        price: this.currentPrice,
        quantity: Math.random() * 5,
        timestamp: Date.now()
      };
      
      this.tickCallback(tick);
    }, 200); 
  }

  disconnect(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.status = 'DISCONNECTED';
  }

  subscribeToTicker(callback: (tick: Tick) => void): void {
    this.tickCallback = callback;
  }

  async executeOrder(symbol: string, side: Side, quantity: number, price: number, type: OrderType): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      id: `SIM-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      price,
      quantity,
      type,
      status: 'FILLED',
      timestamp: Date.now()
    };
  }
}

// --------------------------------------------------------------------------
// 2. Binance WebSocket Adapter
// --------------------------------------------------------------------------
export class BinanceAdapter implements IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' = 'DISCONNECTED';
  
  private ws: WebSocket | null = null;
  private tickCallback: ((tick: Tick) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    this.status = 'CONNECTING';
    const cleanSymbol = symbol.replace(/[-_]/g, '').toLowerCase(); 
    const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}@trade`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'CONNECTED';
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (!this.tickCallback) return;
        try {
          const data = JSON.parse(event.data);
          this.tickCallback({
            symbol: data.s,
            price: parseFloat(data.p),
            quantity: parseFloat(data.q),
            timestamp: data.E
          });
        } catch (e) { /* ignore parse errors */ }
      };

      this.ws.onerror = (err) => {
        console.error('Binance WS Error', err);
        this.status = 'ERROR';
        reject(err);
      };

      this.ws.onclose = () => {
        this.status = 'DISCONNECTED';
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
  }

  subscribeToTicker(callback: (tick: Tick) => void): void {
    this.tickCallback = callback;
  }

  async executeOrder(symbol: string, side: Side, quantity: number, price: number, type: OrderType): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return {
      id: `BIN-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      price, 
      quantity,
      type,
      status: 'FILLED', 
      timestamp: Date.now()
    };
  }
}

// --------------------------------------------------------------------------
// 3. Coinbase Pro WebSocket Adapter
// --------------------------------------------------------------------------
export class CoinbaseAdapter implements IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' = 'DISCONNECTED';
  
  private ws: WebSocket | null = null;
  private tickCallback: ((tick: Tick) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    this.status = 'CONNECTING';
    const cleanSymbol = symbol.includes('-') ? symbol : symbol.slice(0,3) + '-' + symbol.slice(3);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

      this.ws.onopen = () => {
        this.status = 'CONNECTED';
        const subscribeMsg = {
          type: 'subscribe',
          product_ids: [cleanSymbol],
          channels: ['ticker']
        };
        this.ws?.send(JSON.stringify(subscribeMsg));
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (!this.tickCallback) return;
        try {
            const data = JSON.parse(event.data);
            if (data.type !== 'ticker') return;
            this.tickCallback({
              symbol: data.product_id,
              price: parseFloat(data.price),
              quantity: parseFloat(data.last_size),
              timestamp: new Date(data.time).getTime()
            });
        } catch (e) { /* ignore */ }
      };

      this.ws.onerror = (err) => {
        this.status = 'ERROR';
        reject(err);
      };

      this.ws.onclose = () => {
        this.status = 'DISCONNECTED';
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
  }

  subscribeToTicker(callback: (tick: Tick) => void): void {
    this.tickCallback = callback;
  }

  async executeOrder(symbol: string, side: Side, quantity: number, price: number, type: OrderType): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return {
      id: `CB-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      price,
      quantity,
      type,
      status: 'FILLED',
      timestamp: Date.now()
    };
  }
}

// --------------------------------------------------------------------------
// 4. Custom Generic WebSocket Adapter
// --------------------------------------------------------------------------
export class CustomExchangeAdapter implements IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' = 'DISCONNECTED';
  
  private ws: WebSocket | null = null;
  private tickCallback: ((tick: Tick) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    if (!this.profile.wsUrl) throw new Error("No WS URL provided");
    
    this.status = 'CONNECTING';
    
    return new Promise((resolve, reject) => {
      try {
          this.ws = new WebSocket(this.profile.wsUrl!);
      } catch (e) {
          this.status = 'ERROR';
          reject(e);
          return;
      }

      this.ws.onopen = () => {
        this.status = 'CONNECTED';
        if (this.profile.subscriptionMessage) {
           // Inject symbol into placeholder if present
           const msg = this.profile.subscriptionMessage.replace('{{SYMBOL}}', symbol);
           try {
             this.ws?.send(msg);
           } catch (e) {
             console.error("Failed to send subscription", e);
           }
        }
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (!this.tickCallback) return;
        try {
           const data = JSON.parse(event.data);
           
           // Heuristic Parsing for Generic JSON
           // We look for common keys for price and quantity
           const price = this.findValue(data, ['p', 'price', 'last', 'c', 'ask', 'bid']);
           const qty = this.findValue(data, ['q', 'quantity', 'qty', 'size', 'v', 'vol']);
           
           if (price !== undefined) {
             this.tickCallback({
               symbol: symbol,
               price: parseFloat(price),
               quantity: qty !== undefined ? parseFloat(qty) : 0,
               timestamp: Date.now()
             });
           }
        } catch (e) { /* ignore non-json */ }
      };

      this.ws.onerror = (err) => {
        console.error('Custom WS Error', err);
        this.status = 'ERROR';
        reject(err);
      };

      this.ws.onclose = () => {
        this.status = 'DISCONNECTED';
      };
    });
  }

  private findValue(obj: any, keys: string[]): any {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
    }
    // Deep search limited to 1 level (e.g. data.price)
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            for (const key of keys) {
                if (obj[k][key] !== undefined) return obj[k][key];
            }
        }
    }
    return undefined;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
  }

  subscribeToTicker(callback: (tick: Tick) => void): void {
    this.tickCallback = callback;
  }

  async executeOrder(symbol: string, side: Side, quantity: number, price: number, type: OrderType): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 300)); 
    return {
      id: `CUST-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      price,
      quantity,
      type,
      status: 'FILLED',
      timestamp: Date.now()
    };
  }
}

// --------------------------------------------------------------------------
// Factory
// --------------------------------------------------------------------------
export class ExchangeFactory {
  static create(profile: ExchangeProfile): IExchange {
    if (profile.type === 'PRESET') {
        switch(profile.providerId) {
            case 'BINANCE': return new BinanceAdapter(profile);
            case 'COINBASE': return new CoinbaseAdapter(profile);
            case 'SIMULATION': return new SimulationAdapter(profile);
            default: return new SimulationAdapter(profile);
        }
    } else {
        return new CustomExchangeAdapter(profile);
    }
  }
}

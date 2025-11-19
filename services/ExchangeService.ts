
import { Tick, Order, Side, OrderType, ExchangeProfile, OrderBook, OrderBookEntry } from '../types';

// Unified Interface for all Exchange Adapters
export interface IExchange {
  profile: ExchangeProfile;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  
  connect(symbol: string): Promise<void>;
  disconnect(): void;
  
  // Market Data
  subscribeToTicker(callback: (tick: Tick) => void): void;
  subscribeToOrderBook(symbol: string, callback: (book: OrderBook) => void): void;

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
  private bookIntervalId: any = null;
  private currentPrice = 64000;
  private tickCallback: ((tick: Tick) => void) | null = null;
  private bookCallback: ((book: OrderBook) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    this.status = 'CONNECTED';
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.bookIntervalId) clearInterval(this.bookIntervalId);
    
    // Ticker
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

    // Order Book (Updates every 500ms)
    this.bookIntervalId = setInterval(() => {
        if (!this.bookCallback) return;
        this.bookCallback(this.generateMockBook(symbol));
    }, 500);
  }

  private generateMockBook(symbol: string): OrderBook {
      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];
      
      // Generate a tighter spread (0.01% - 0.05%)
      const spread = this.currentPrice * (0.0001 + Math.random() * 0.0004);
      const midPrice = this.currentPrice;
      
      for (let i = 0; i < 15; i++) {
          // Bids: Decreasing from Mid - Spread/2
          const bidPrice = midPrice - (spread / 2) - (i * (Math.random() * 2 + 1));
          bids.push({
              price: bidPrice,
              size: Math.random() * 2.5 + 0.1 + (i * 0.1) // Slight increase in depth further out
          });

          // Asks: Increasing from Mid + Spread/2
          const askPrice = midPrice + (spread / 2) + (i * (Math.random() * 2 + 1));
          asks.push({
              price: askPrice,
              size: Math.random() * 2.5 + 0.1 + (i * 0.1)
          });
      }

      return {
          symbol,
          bids,
          asks,
          timestamp: Date.now()
      };
  }

  disconnect(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.bookIntervalId) clearInterval(this.bookIntervalId);
    this.status = 'DISCONNECTED';
  }

  subscribeToTicker(callback: (tick: Tick) => void): void {
    this.tickCallback = callback;
  }

  subscribeToOrderBook(symbol: string, callback: (book: OrderBook) => void): void {
      this.bookCallback = callback;
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
  private bookCallback: ((book: OrderBook) => void) | null = null;

  constructor(profile: ExchangeProfile) {
    this.profile = profile;
  }

  async connect(symbol: string): Promise<void> {
    this.status = 'CONNECTING';
    const cleanSymbol = symbol.replace(/[-_]/g, '').toLowerCase(); 
    // Combined stream: trade + depth20 (100ms)
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${cleanSymbol}@trade/${cleanSymbol}@depth20@100ms`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'CONNECTED';
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg.data) return;
          
          const stream = msg.stream;
          const data = msg.data;

          // Ticker Logic
          if (stream.endsWith('@trade') && this.tickCallback) {
              this.tickCallback({
                symbol: data.s,
                price: parseFloat(data.p),
                quantity: parseFloat(data.q),
                timestamp: data.E
              });
          }

          // Order Book Logic
          if (stream.endsWith('@depth20@100ms') && this.bookCallback) {
              const bids = data.bids.map((b: any) => ({ price: parseFloat(b[0]), size: parseFloat(b[1]) }));
              const asks = data.asks.map((a: any) => ({ price: parseFloat(a[0]), size: parseFloat(a[1]) }));
              
              this.bookCallback({
                  symbol: symbol,
                  bids,
                  asks,
                  timestamp: Date.now()
              });
          }

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
  
  subscribeToOrderBook(symbol: string, callback: (book: OrderBook) => void): void {
    this.bookCallback = callback;
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
  private bookCallback: ((book: OrderBook) => void) | null = null;

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
          channels: ['ticker', 'level2'] // level2 is full book
        };
        this.ws?.send(JSON.stringify(subscribeMsg));
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ticker' && this.tickCallback) {
                this.tickCallback({
                    symbol: data.product_id,
                    price: parseFloat(data.price),
                    quantity: parseFloat(data.last_size),
                    timestamp: new Date(data.time).getTime()
                });
            }

            // Simplified Snapshot handling for demo (full L2 updates are complex for a single file)
            if (data.type === 'snapshot' && this.bookCallback) {
                 const bids = data.bids.slice(0, 20).map((b: any) => ({ price: parseFloat(b[0]), size: parseFloat(b[1]) }));
                 const asks = data.asks.slice(0, 20).map((a: any) => ({ price: parseFloat(a[0]), size: parseFloat(a[1]) }));
                 this.bookCallback({
                     symbol: data.product_id,
                     bids,
                     asks,
                     timestamp: Date.now()
                 });
            }
            // Ignore l2update for this lightweight adapter
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
  
  subscribeToOrderBook(symbol: string, callback: (book: OrderBook) => void): void {
      this.bookCallback = callback;
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
  private bookCallback: ((book: OrderBook) => void) | null = null;

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
        // Generic logic remains for Ticks
        if (this.tickCallback) {
            try {
                const data = JSON.parse(event.data);
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
            } catch(e) {}
        }
        // Custom Order book logic is too complex for generic json parsing without JSONPath config
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

  private findValue(obj: any, keys: string[]): any {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
    }
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

  subscribeToOrderBook(symbol: string, callback: (book: OrderBook) => void): void {
    this.bookCallback = callback;
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

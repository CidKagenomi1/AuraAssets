/**
 * MarketClient.js
 * Authoritative Market Engine Client (REST API + Socket.IO Real-Time + Supabase Auth)
 * Connects the AuraAssets Frontend to `market-server`.
 */

import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import gameState from '../core/GameState.js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const DEFAULT_API_URL = env.VITE_MARKET_API_URL || 'http://localhost:3001';
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
const PRICE_SCALE = Number(env.VITE_PRICE_SCALE || 100);

export class MarketClient {
  constructor() {
    this.baseUrl = DEFAULT_API_URL.replace(/\/+$/, '');
    this.priceScale = PRICE_SCALE;
    this.socket = null;
    this.isConnected = false;
    this.subscribedSymbols = new Set();
    this.authToken = null;
    this.devPlayerId = localStorage.getItem('auraAssets_devPlayerId') || null;

    this.supabase =
      SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

    this.handlers = {
      onSnapshot: null,
      onTrade: null,
      onBookUpdate: null,
      onTicker: null,
      onOrderUpdated: null,
      onConnectChange: null
    };
  }

  /**
   * Convert display price (e.g. 180.50) to integer minor unit (e.g. 18050)
   */
  toMinorUnit(displayPrice) {
    if (displayPrice === null || displayPrice === undefined) return null;
    return Math.round(Number(displayPrice) * this.priceScale);
  }

  /**
   * Convert integer minor unit (e.g. 18050) to display price (e.g. 180.50)
   */
  fromMinorUnit(minorValue) {
    if (minorValue === null || minorValue === undefined) return 0;
    return Number((Number(minorValue) / this.priceScale).toFixed(2));
  }

  /**
   * Generate a unique idempotency key for every order command
   */
  generateIdempotencyKey(prefix = 'ord') {
    const uuid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return `${prefix}-${uuid}`;
  }

  /**
   * Resolve Bearer JWT from Supabase session or fallback dev headers
   */
  async getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.supabase) {
      const { data } = await this.supabase.auth.getSession();
      if (data?.session?.access_token) {
        this.authToken = data.session.access_token;
      }
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    } else if (this.devPlayerId) {
      headers['x-dev-player-id'] = this.devPlayerId;
      headers['x-dev-username'] = gameState.currentUser || 'Player';
    }

    return headers;
  }

  /**
   * Execute an authenticated HTTP request against the Fastify REST API
   */
  async request(path, options = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(body.message || `API Error (${response.status})`);
      err.code = body.error || 'API_ERROR';
      err.status = response.status;
      err.details = body.details;
      throw err;
    }

    return body;
  }

  /**
   * Initialize Socket.IO real-time connection and bind market events
   */
  async connect(callbacks = {}) {
    this.handlers = { ...this.handlers, ...callbacks };

    if (this.supabase) {
      const { data } = await this.supabase.auth.getSession();
      if (data?.session?.access_token) {
        this.authToken = data.session.access_token;
      }
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: this.authToken ? `Bearer ${this.authToken}` : undefined,
        devPlayerId: !this.authToken ? this.devPlayerId : undefined,
        devUsername: gameState.currentUser || 'Player'
      }
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.handlers.onConnectChange?.(true);

      // Re-subscribe to all active symbols on connect / reconnect to recover snapshot
      for (const symbol of this.subscribedSymbols) {
        this.socket.emit('market:subscribe', { symbol });
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.handlers.onConnectChange?.(false);
    });

    this.socket.on('market:snapshot', (snapshot) => {
      this.handlers.onSnapshot?.(snapshot);
    });

    this.socket.on('market:trade', (trade) => {
      this.handlers.onTrade?.(trade);
    });

    this.socket.on('market:book_update', (book) => {
      this.handlers.onBookUpdate?.(book);
    });

    this.socket.on('market:ticker', (ticker) => {
      this.handlers.onTicker?.(ticker);
    });

    this.socket.on('order:updated', (order) => {
      this.handlers.onOrderUpdated?.(order);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  subscribeSymbol(symbol) {
    const clean = String(symbol).trim().toUpperCase();
    this.subscribedSymbols.add(clean);
    if (this.socket && this.isConnected) {
      this.socket.emit('market:subscribe', { symbol: clean });
    }
  }

  unsubscribeSymbol(symbol) {
    const clean = String(symbol).trim().toUpperCase();
    this.subscribedSymbols.delete(clean);
    if (this.socket && this.isConnected) {
      this.socket.emit('market:unsubscribe', { symbol: clean });
    }
  }

  // ==========================================
  // REST API COMMANDS & QUERIES
  // ==========================================

  async fetchStocks() {
    const res = await this.request('/api/market/stocks');
    return res.data || [];
  }

  async fetchStockDetail(symbol) {
    const res = await this.request(`/api/market/${encodeURIComponent(symbol)}`);
    return res.data;
  }

  async fetchOrderBook(symbol, depth = 20) {
    const res = await this.request(`/api/market/${encodeURIComponent(symbol)}/orderbook?depth=${depth}`);
    return res.data;
  }

  async fetchTrades(symbol, limit = 50) {
    const res = await this.request(`/api/market/${encodeURIComponent(symbol)}/trades?limit=${limit}`);
    return res.data || [];
  }

  async fetchPortfolio() {
    const res = await this.request('/api/portfolio');
    return res.data;
  }

  async fetchMyOrders({ symbol, status, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request(`/api/orders/me${qs}`);
    return res.data || [];
  }

  async placeOrder({ symbol, side, type, price = null, quantity, idempotencyKey }) {
    const idemKey = idempotencyKey || this.generateIdempotencyKey(`${side.toLowerCase()}-${symbol.toLowerCase()}`);
    const payload = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: Math.round(Number(quantity)),
      idempotencyKey: idemKey,
      ...(type.toUpperCase() === 'LIMIT' ? { price: this.toMinorUnit(price) } : { price: null })
    };

    return this.request('/api/orders', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idemKey
      },
      body: JSON.stringify(payload)
    });
  }

  async cancelOrder(orderId) {
    return this.request(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE'
    });
  }
}

export const marketClient = new MarketClient();
export default marketClient;


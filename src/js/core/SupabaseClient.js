/**
 * SupabaseClient.js - Global Cloud Synchronization, Supabase Auth & Realtime Engine
 * Connects frontend directly to Supabase Auth and Realtime with strict RLS enforcement.
 */

import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isCloudConfigured) {
  console.info('[SupabaseClient] Running in pure Local / Offline Mode (No cloud environment variables provided).');
}

export const supabase = isCloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ==========================================
// SUPABASE AUTHENTICATION ENGINE
// ==========================================

/**
 * Convert user-friendly game username to a valid deterministic email for Supabase Auth
 * e.g. "Warren Buffett" -> "warren_buffett@auraassets.game"
 */
export function usernameToEmail(username) {
  if (!username) return '';
  const clean = String(username).trim().toLowerCase();
  if (clean.includes('@')) return clean;
  const safeSlug = clean.replace(/[^a-z0-9_.-]/g, '_');
  return `${safeSlug}@auraassets.game`;
}

/**
 * Register a new player account directly through Supabase Auth
 */
export async function authSignUp(username, password) {
  if (!isCloudConfigured || !supabase) {
    return { user: null, session: null, offline: true };
  }
  const cleanName = String(username).trim();
  const email = usernameToEmail(cleanName);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: cleanName,
        display_name: cleanName
      }
    }
  });

  if (error) {
    throw error;
  }
  return { user: data.user, session: data.session };
}

/**
 * Sign in an existing player through Supabase Auth
 */
export async function authSignIn(username, password) {
  if (!isCloudConfigured || !supabase) {
    return { user: null, session: null, offline: true };
  }
  const cleanName = String(username).trim();
  const email = usernameToEmail(cleanName);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }
  return { user: data.user, session: data.session };
}

/**
 * Sign out current player from Supabase Auth
 */
export async function authSignOut() {
  if (!isCloudConfigured || !supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[Supabase Auth] Sign out notice:', e.message);
  }
}

/**
 * Get current authenticated Supabase user
 */
export async function getAuthUser() {
  if (!isCloudConfigured || !supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (e) {
    return null;
  }
}

/**
 * Get current authenticated session (containing JWT access token)
 */
export async function getAuthSession() {
  if (!isCloudConfigured || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch (e) {
    return null;
  }
}

// ==========================================
// REALTIME MARKET EVENTS & NEWS
// ==========================================

let isRealtimeSubscribed = false;

/**
 * Initialize global market news listener via Supabase Realtime
 */
export function initGlobalNewsRealtime(newsManager) {
  if (!isCloudConfigured || !supabase) return null;
  if (isRealtimeSubscribed) return null;
  isRealtimeSubscribed = true;

  // 1. Initial Fetch of active events from Supabase Cloud
  fetchActiveCloudEvents(newsManager);

  // 2. Subscribe to Postgres Changes on market_events table
  const channel = supabase
    .channel('global_market_events_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'market_events'
      },
      (payload) => {
        const row = payload.new;
        if (!row) return;

        const incomingEvent = {
          id: row.id,
          market: row.market,
          type: row.type,
          headline: row.headline,
          ticker_target: row.ticker_target,
          target_asset: row.target_asset,
          sector: row.sector,
          impact_percent: parseFloat(row.impact_percent),
          duration_minutes: row.duration_minutes,
          startTime: new Date(row.start_time).getTime(),
          endTime: new Date(row.end_time).getTime(),
          timestamp: new Date(row.created_at).getTime()
        };

        if (incomingEvent.endTime > Date.now()) {
          newsManager.receiveCloudEvent(incomingEvent);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🟢 [Supabase Realtime] Connected to global market channel!');
      }
    });

  return channel;
}

/**
 * Fetch currently active events from Supabase Cloud
 */
async function fetchActiveCloudEvents(newsManager) {
  if (!isCloudConfigured || !supabase) return;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('market_events')
      .select('*')
      .gt('end_time', nowIso)
      .order('start_time', { ascending: false })
      .limit(5);

    if (error) {
      console.warn('[Supabase Realtime] Could not fetch cloud events:', error.message);
      return;
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        const item = {
          id: row.id,
          market: row.market,
          type: row.type,
          headline: row.headline,
          ticker_target: row.ticker_target,
          target_asset: row.target_asset,
          sector: row.sector,
          impact_percent: parseFloat(row.impact_percent),
          duration_minutes: row.duration_minutes,
          startTime: new Date(row.start_time).getTime(),
          endTime: new Date(row.end_time).getTime(),
          timestamp: new Date(row.created_at).getTime()
        };

        if (item.endTime > Date.now()) {
          newsManager.receiveCloudEvent(item, false);
        }
      });
    }
  } catch (err) {
    console.warn('[Supabase Realtime] Cloud sync exception:', err);
  }
}

/**
 * Broadcast event to cloud (requires authenticated admin or service role)
 */
export async function broadcastCloudEvent(eventItem) {
  if (!isCloudConfigured || !supabase) return;
  try {
    const record = {
      id: eventItem.id,
      market: eventItem.market,
      type: eventItem.type,
      headline: eventItem.headline,
      ticker_target: eventItem.ticker_target || null,
      target_asset: eventItem.target_asset || null,
      sector: eventItem.sector,
      impact_percent: eventItem.impact_percent,
      duration_minutes: eventItem.duration_minutes,
      start_time: new Date(eventItem.startTime).toISOString(),
      end_time: new Date(eventItem.endTime).toISOString()
    };

    const { error } = await supabase
      .from('market_events')
      .upsert(record, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Realtime] Notice: event broadcast skipped (admin policy enforced):', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Realtime] Publish error:', err);
  }
}

let isMarketStateSubscribed = false;

/**
 * Initialize global live market quotes synchronization via Supabase Realtime
 */
export function initMarketStateRealtime(onStockStateUpdate, onCryptoStateUpdate) {
  if (!isCloudConfigured || !supabase) return null;
  if (isMarketStateSubscribed) return null;
  isMarketStateSubscribed = true;

  try {
    const channel = supabase
      .channel('public_market_state_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_state' },
        (payload) => {
          if (payload.new && onStockStateUpdate) {
            onStockStateUpdate(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crypto_market_state' },
        (payload) => {
          if (payload.new && onCryptoStateUpdate) {
            onCryptoStateUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 [Supabase Realtime] Connected to market_state & crypto_market_state channels!');
        }
      });

    return channel;
  } catch (err) {
    console.warn('[Supabase Realtime] Market state subscription error:', err);
    return null;
  }
}

// ==========================================
// DIRECT FRONTEND CLOUD PERSISTENCE (RLS SECURED)
// ==========================================

/**
 * Save player profile, full save game JSON, and active portfolio directly to Supabase Cloud.
 * Enforces authenticated identity (auth.uid() = player_id). Never stores password_hash.
 */
export async function savePlayerToCloud(username, state, netWorth = 0) {
  if (!isCloudConfigured || !supabase || !username || !state) return false;
  const usernameLower = String(username).trim().toLowerCase();
  if (!usernameLower) return false;

  try {
    const user = await getAuthUser();
    if (!user) {
      // In offline / unauthenticated mode, local save in localStorage is used
      return false;
    }

    const playerId = user.id;

    // 1. Upsert full player save into player_saves table (strictly bound to auth.uid())
    const payload = {
      player_id: playerId,
      username: usernameLower,
      display_name: state.player?.name || username,
      balance: Math.max(0, Math.round(Number(state.player?.balance || 0))),
      net_worth: Math.max(0, Math.round(Number(netWorth || 0))),
      role: state.player?.role || 'investor',
      credit_score: Math.round(Number(state.player?.creditScore || 700)),
      save_data: state,
      updated_at: new Date().toISOString()
    };

    const { error: saveErr } = await supabase
      .from('player_saves')
      .upsert(payload, { onConflict: 'player_id' });

    if (saveErr) {
      console.warn('⚠️ [Supabase Cloud Save] Error saving player_saves:', saveErr.message);
      return false;
    }

    // 2. Mirror active holdings to player_portfolio with player_id for Table Editor
    const portfolioRows = [];

    // Stocks
    if (state.stocks && typeof state.stocks === 'object') {
      for (const [sym, item] of Object.entries(state.stocks)) {
        const amount = Number(item.shares || item.amount || 0);
        if (amount > 0) {
          const avgPrice = Number(item.avgBuyPrice || 0);
          portfolioRows.push({
            id: `${playerId}_stock_${sym}`,
            player_id: playerId,
            username: usernameLower,
            asset_type: 'stock',
            symbol: sym,
            name: item.name || sym,
            amount,
            avg_buy_price: avgPrice,
            total_invested: Number(item.totalInvested || (amount * avgPrice)),
            current_price: Number(item.currentPrice || avgPrice),
            current_value: Number(amount * (item.currentPrice || avgPrice)),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    // Crypto
    if (state.crypto && typeof state.crypto === 'object') {
      for (const [sym, item] of Object.entries(state.crypto)) {
        const amount = Number(item.amount || item.shares || 0);
        if (amount > 0) {
          const avgPrice = Number(item.avgBuyPrice || 0);
          portfolioRows.push({
            id: `${playerId}_crypto_${sym}`,
            player_id: playerId,
            username: usernameLower,
            asset_type: 'crypto',
            symbol: sym,
            name: item.name || sym,
            amount,
            avg_buy_price: avgPrice,
            total_invested: Number(item.totalInvested || (amount * avgPrice)),
            current_price: Number(item.currentPrice || avgPrice),
            current_value: Number(amount * (item.currentPrice || avgPrice)),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    // Mutual funds / Reksa Dana
    const rdPortfolio = state.savings?.reksaDana;
    if (rdPortfolio && typeof rdPortfolio === 'object') {
      for (const [fundId, item] of Object.entries(rdPortfolio)) {
        const units = Number(item.units || 0);
        if (units > 0) {
          const avgNav = Number(item.avgNav || 0);
          portfolioRows.push({
            id: `${playerId}_mutual_fund_${fundId}`,
            player_id: playerId,
            username: usernameLower,
            asset_type: 'mutual_fund',
            symbol: fundId,
            name: item.name || fundId,
            amount: units,
            avg_buy_price: avgNav,
            total_invested: Number(item.totalInvested || (units * avgNav)),
            current_price: Number(item.currentNav || avgNav),
            current_value: Number(units * (item.currentNav || avgNav)),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    if (portfolioRows.length > 0) {
      await supabase
        .from('player_portfolio')
        .upsert(portfolioRows, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase Cloud Save] Exception during cloud sync:', err);
    return false;
  }
}

/**
 * Load player save from Supabase Cloud for the authenticated player
 */
export async function loadPlayerFromCloud(username) {
  if (!isCloudConfigured || !supabase) return null;
  try {
    const user = await getAuthUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('player_saves')
      .select('*')
      .eq('player_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ [Supabase Cloud Load] Error loading save:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('⚠️ [Supabase Cloud Load] Exception:', err);
    return null;
  }
}

/**
 * Record a transaction row directly into player_transactions table in Supabase
 */
export async function recordCloudTransaction(username, tx) {
  if (!isCloudConfigured || !supabase || !tx) return;
  const usernameLower = String(username).trim().toLowerCase();
  try {
    const user = await getAuthUser();
    if (!user) return;

    await supabase.from('player_transactions').insert({
      player_id: user.id,
      username: usernameLower,
      type: String(tx.type || 'GENERAL'),
      description: String(tx.description || ''),
      amount: Number(tx.amount || 0),
      balance_after: Number(tx.balance || 0),
      created_at: new Date(tx.timestamp || Date.now()).toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [Supabase Cloud Transaction] Log error:', err);
  }
}

/**
 * Fetch public leaderboard from Supabase Cloud (safe public metrics only)
 */
export async function getCloudAccounts() {
  if (!isCloudConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('public_leaderboard')
      .select('username, display_name, balance, net_worth, role, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

export default supabase;

/**
 * SupabaseClient.js - Global Cloud Synchronization & Realtime Engine
 * Connects frontend directly to Supabase Realtime (No separate server required for Vercel)
 */

import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://qdqifdomtwuqvvyzglog.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JLILs9s6i0jckA6Vd34G7w_Nk5VTbUq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

let isRealtimeSubscribed = false;

/**
 * Initialize global market news listener via Supabase Realtime
 * Listens for new events across ALL active players/devices
 */
export function initGlobalNewsRealtime(newsManager) {
  if (isRealtimeSubscribed) return;
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

        // Inject into NewsManager if still valid
        if (incomingEvent.endTime > Date.now()) {
          newsManager.receiveCloudEvent(incomingEvent);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase Realtime] Connected to global market channel!');
      }
    });

  return channel;
}

/**
 * Fetch currently active events from Supabase Cloud
 */
async function fetchActiveCloudEvents(newsManager) {
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
          newsManager.receiveCloudEvent(item, false); // false = silent on initial sync
        }
      });
    }
  } catch (err) {
    console.warn('[Supabase Realtime] Cloud sync exception:', err);
  }
}

/**
 * Publish newly triggered event to Supabase Cloud so all devices receive it
 */
export async function broadcastCloudEvent(eventItem) {
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
      console.warn('[Supabase Realtime] Could not publish event to cloud:', error.message);
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
// DIRECT FRONTEND CLOUD PERSISTENCE (SOLUTION 1)
// ==========================================

/**
 * Save player profile, full save game JSON, and active portfolio directly to Supabase Cloud
 */
export async function savePlayerToCloud(username, state, netWorth = 0) {
  if (!username || !state) return false;
  const usernameLower = String(username).trim().toLowerCase();
  if (!usernameLower) return false;

  try {
    // 1. Upsert full player save into player_saves table
    const payload = {
      username: usernameLower,
      display_name: state.player?.name || username,
      balance: Math.round(Number(state.player?.balance || 0)),
      net_worth: Math.round(Number(netWorth || 0)),
      role: state.player?.role || 'investor',
      credit_score: Math.round(Number(state.player?.creditScore || 700)),
      save_data: state,
      updated_at: new Date().toISOString()
    };

    const { error: saveErr } = await supabase
      .from('player_saves')
      .upsert(payload, { onConflict: 'username' });

    if (saveErr) {
      console.warn('⚠️ [Supabase Cloud Save] Error saving player_saves:', saveErr.message);
      return false;
    }

    // 2. Mirror active holdings to player_portfolio for direct Supabase Table Editor visibility
    const portfolioRows = [];

    // Stocks
    if (state.stocks && typeof state.stocks === 'object') {
      for (const [sym, item] of Object.entries(state.stocks)) {
        const amount = Number(item.shares || item.amount || 0);
        if (amount > 0) {
          const avgPrice = Number(item.avgBuyPrice || 0);
          portfolioRows.push({
            id: `${usernameLower}_stock_${sym}`,
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
            id: `${usernameLower}_crypto_${sym}`,
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
            id: `${usernameLower}_mutual_fund_${fundId}`,
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
 * Load player save from Supabase Cloud
 */
export async function loadPlayerFromCloud(username) {
  if (!username) return null;
  const usernameLower = String(username).trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('player_saves')
      .select('*')
      .eq('username', usernameLower)
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
  if (!username || !tx) return;
  const usernameLower = String(username).trim().toLowerCase();
  try {
    await supabase.from('player_transactions').insert({
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
 * Fetch all registered player accounts from Supabase Cloud
 */
export async function getCloudAccounts() {
  try {
    const { data, error } = await supabase
      .from('player_saves')
      .select('username, display_name, balance, net_worth, role, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('⚠️ [Supabase Accounts] Error fetching cloud accounts:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

export default supabase;


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

export default supabase;


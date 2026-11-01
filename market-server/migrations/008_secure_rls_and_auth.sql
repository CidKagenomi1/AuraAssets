-- ============================================================================
-- Migration 008: Secure Row Level Security (RLS) & Supabase Auth Hardening
-- Target: Supabase PostgreSQL
-- Resolves Critical Security Findings from Audit:
-- 1. Eliminates public wide-open policies (USING (true) WITH CHECK (true))
-- 2. Binds player_saves, player_portfolio, player_transactions to auth.uid()
-- 3. Drops unencrypted password_hash from client-accessible player_saves table
-- 4. Restricts market_events INSERT/UPDATE to service_role / authorized publishers
-- 5. Exposes a sanitized public_leaderboard view without raw save_data payloads
-- ============================================================================

-- 1. DROP PASSWORD_HASH FROM PLAYER_SAVES
-- Passwords must NEVER be stored or exposed in client tables.
-- Authentication is handled strictly via Supabase Auth (auth.users).
ALTER TABLE player_saves DROP COLUMN IF EXISTS password_hash;

-- Ensure player_id is indexed and unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_saves_player_id ON player_saves(player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_saves_username ON player_saves(username);

-- 2. DROP PERMISSIVE PUBLIC POLICIES
DROP POLICY IF EXISTS "Allow public all player_saves" ON player_saves;
DROP POLICY IF EXISTS "Allow public all player_portfolio" ON player_portfolio;
DROP POLICY IF EXISTS "Allow public all player_transactions" ON player_transactions;
DROP POLICY IF EXISTS "Allow public insert on market_events" ON market_events;
DROP POLICY IF EXISTS "Allow public update on market_events" ON market_events;

-- 3. ENFORCE STRICT RLS ON PLAYER_SAVES
-- Players can only read, insert, update, and delete their own save file.
ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_saves_select_own" ON player_saves;
CREATE POLICY "player_saves_select_own" ON player_saves
    FOR SELECT
    USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "player_saves_insert_own" ON player_saves;
CREATE POLICY "player_saves_insert_own" ON player_saves
    FOR INSERT
    WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "player_saves_update_own" ON player_saves;
CREATE POLICY "player_saves_update_own" ON player_saves
    FOR UPDATE
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "player_saves_delete_own" ON player_saves;
CREATE POLICY "player_saves_delete_own" ON player_saves
    FOR DELETE
    USING (auth.uid() = player_id);

-- 4. ENFORCE STRICT RLS ON PLAYER_PORTFOLIO
ALTER TABLE player_portfolio ADD COLUMN IF NOT EXISTS player_id UUID;
CREATE INDEX IF NOT EXISTS idx_player_portfolio_player_id ON player_portfolio(player_id);

ALTER TABLE player_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_portfolio_owner_access" ON player_portfolio;
CREATE POLICY "player_portfolio_owner_access" ON player_portfolio
    FOR ALL
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- 5. ENFORCE STRICT RLS ON PLAYER_TRANSACTIONS
ALTER TABLE player_transactions ADD COLUMN IF NOT EXISTS player_id UUID;
CREATE INDEX IF NOT EXISTS idx_player_transactions_player_id ON player_transactions(player_id);

ALTER TABLE player_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_transactions_owner_access" ON player_transactions;
CREATE POLICY "player_transactions_owner_access" ON player_transactions
    FOR ALL
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- 6. RESTRICT MARKET_EVENTS
-- Allow public SELECT (read-only for all players)
ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on market_events" ON market_events;
CREATE POLICY "Allow public read on market_events" ON market_events
    FOR SELECT
    USING (true);

-- 7. SECURE PUBLIC LEADERBOARD VIEW
-- Exposes high-level player metrics (display_name, net_worth, role)
-- WITHOUT exposing save_data or private account info.
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
    player_id,
    username,
    display_name,
    balance,
    net_worth,
    role,
    credit_score,
    updated_at
FROM player_saves;

GRANT SELECT ON public_leaderboard TO anon, authenticated;


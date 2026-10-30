-- ============================================================================
-- Migration 006: Direct Cloud Sync Tables for Frontend Architecture (No Server Required)
-- Allows players to save their account profile, full save game JSON, active portfolio,
-- and transactions directly into Supabase Cloud with offline fallback.
-- ============================================================================

-- 1. PLAYER CLOUD SAVES (Full state snapshot + fast index columns)
CREATE TABLE IF NOT EXISTS player_saves (
    username TEXT PRIMARY KEY,
    player_id UUID NOT NULL DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    password_hash TEXT,
    balance NUMERIC NOT NULL DEFAULT 0,
    net_worth NUMERIC NOT NULL DEFAULT 0,
    role TEXT DEFAULT 'investor',
    credit_score INT DEFAULT 700,
    save_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PLAYER PORTFOLIO (Detailed active holdings viewable in Supabase Table Editor)
CREATE TABLE IF NOT EXISTS player_portfolio (
    id TEXT PRIMARY KEY, -- e.g. {username}_{asset_type}_{symbol}
    username TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'stock' | 'crypto' | 'mutual_fund'
    symbol TEXT NOT NULL,
    name TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC NOT NULL DEFAULT 0,
    total_invested NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC DEFAULT 0,
    current_value NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_portfolio_username ON player_portfolio(username);

-- 3. PLAYER TRANSACTIONS LOG
CREATE TABLE IF NOT EXISTS player_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_transactions_username ON player_transactions(username);

-- 4. ENABLE RLS WITH PERMISSIVE POLICIES FOR FRONTEND DIRECT ACCESS
ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all player_saves" ON player_saves;
CREATE POLICY "Allow public all player_saves" ON player_saves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_portfolio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all player_portfolio" ON player_portfolio;
CREATE POLICY "Allow public all player_portfolio" ON player_portfolio FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all player_transactions" ON player_transactions;
CREATE POLICY "Allow public all player_transactions" ON player_transactions FOR ALL USING (true) WITH CHECK (true);

-- 5. ENABLE REALTIME
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE player_saves;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE player_portfolio;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;
    END IF;
END $$;

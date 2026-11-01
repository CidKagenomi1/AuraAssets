-- 009_transfers_and_community_donations.sql
-- Table for persistent P2P transfers and Community Grants across devices

CREATE TABLE IF NOT EXISTS player_transfers (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    admin_fee NUMERIC NOT NULL DEFAULT 0,
    total_deduction NUMERIC NOT NULL,
    note TEXT DEFAULT '',
    game_date TEXT,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_transfers_to_user ON player_transfers(to_user);
CREATE INDEX IF NOT EXISTS idx_player_transfers_from_user ON player_transfers(from_user);

CREATE TABLE IF NOT EXISTS community_donations (
    id TEXT PRIMARY KEY,
    donor TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    per_player_grant NUMERIC NOT NULL,
    note TEXT DEFAULT '',
    game_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_donations_created_at ON community_donations(created_at DESC);

-- Enable RLS
ALTER TABLE player_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_donations ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert & update
DROP POLICY IF EXISTS "Allow public all player_transfers" ON player_transfers;
CREATE POLICY "Allow public all player_transfers" ON player_transfers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all community_donations" ON community_donations;
CREATE POLICY "Allow public all community_donations" ON community_donations FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE player_transfers;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE community_donations;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;


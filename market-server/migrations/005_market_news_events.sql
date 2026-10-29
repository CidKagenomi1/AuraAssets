-- 005_market_news_events.sql
-- Table for synchronized global market news events across all devices & players

CREATE TABLE IF NOT EXISTS market_events (
    id TEXT PRIMARY KEY,
    market TEXT NOT NULL,
    type TEXT NOT NULL,
    headline TEXT NOT NULL,
    ticker_target TEXT,
    target_asset TEXT,
    sector TEXT NOT NULL,
    impact_percent NUMERIC(6, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_events_end_time ON market_events (end_time);

ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_events' AND policyname = 'Allow public read on market_events'
  ) THEN
    CREATE POLICY "Allow public read on market_events" ON market_events FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_events' AND policyname = 'Allow public insert on market_events'
  ) THEN
    CREATE POLICY "Allow public insert on market_events" ON market_events FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_events' AND policyname = 'Allow public update on market_events'
  ) THEN
    CREATE POLICY "Allow public update on market_events" ON market_events FOR UPDATE USING (true);
  END IF;
END $$;

-- Add to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'market_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE market_events;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Silently ignore if publication doesn't exist in dev pg
END $$;


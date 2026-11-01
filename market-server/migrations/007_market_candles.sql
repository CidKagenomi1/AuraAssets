-- 007_market_candles.sql
-- In-memory accumulator & storage schema for true OHLC candle rollups

CREATE TABLE IF NOT EXISTS market_candles (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- '1m', '5m', '1h', '1d'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume NUMERIC DEFAULT 0,
    CONSTRAINT uq_symbol_tf_time UNIQUE (symbol, timeframe, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_candles_lookup 
ON market_candles (symbol, timeframe, timestamp DESC);

-- Automated retention policy: clean 1m candles older than 7 days
CREATE OR REPLACE FUNCTION prune_expired_market_candles()
RETURNS void AS $$
BEGIN
    DELETE FROM market_candles 
    WHERE timeframe = '1m' AND timestamp < NOW() - INTERVAL '7 days';

    DELETE FROM market_candles 
    WHERE timeframe = '1h' AND timestamp < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;


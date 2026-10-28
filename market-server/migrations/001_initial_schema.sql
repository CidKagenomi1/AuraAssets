-- ============================================================================
-- Migration 001: Initial Authoritative Market Engine Schema
-- Target: Supabase PostgreSQL
-- Rules:
--   - UUID for primary keys
--   - TIMESTAMPTZ for all timestamps
--   - BIGINT for all prices, balances, and quantities (in smallest integer unit)
--   - Strict CHECK constraints to prevent negative balances/positions
--   - Immutable ledger_entries enforced by database trigger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STOCKS TABLE
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sector TEXT NOT NULL DEFAULT 'General',
    tick_size BIGINT NOT NULL CHECK (tick_size > 0),
    lot_size BIGINT NOT NULL DEFAULT 1 CHECK (lot_size > 0),
    base_price BIGINT NOT NULL CHECK (base_price > 0),
    shares_outstanding BIGINT NOT NULL DEFAULT 1000000000 CHECK (shares_outstanding > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS accounts (
    player_id UUID PRIMARY KEY,
    username TEXT NOT NULL DEFAULT 'Player',
    available_balance BIGINT NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance BIGINT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. POSITIONS TABLE
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES accounts(player_id) ON DELETE RESTRICT,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    symbol TEXT NOT NULL,
    available_quantity BIGINT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    locked_quantity BIGINT NOT NULL DEFAULT 0 CHECK (locked_quantity >= 0),
    avg_buy_price BIGINT NOT NULL DEFAULT 0 CHECK (avg_buy_price >= 0),
    total_invested BIGINT NOT NULL DEFAULT 0 CHECK (total_invested >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_positions_player_stock UNIQUE (player_id, stock_id),
    CONSTRAINT uq_positions_player_symbol UNIQUE (player_id, symbol)
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES accounts(player_id) ON DELETE RESTRICT,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('LIMIT', 'MARKET')),
    price BIGINT CHECK (
        (type = 'LIMIT' AND price IS NOT NULL AND price > 0) OR
        (type = 'MARKET' AND price IS NULL)
    ),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    filled_quantity BIGINT NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
    remaining_quantity BIGINT NOT NULL CHECK (remaining_quantity >= 0),
    locked_funds BIGINT NOT NULL DEFAULT 0 CHECK (locked_funds >= 0),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
    reject_reason TEXT,
    idempotency_key TEXT NOT NULL,
    seq_no BIGSERIAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_quantities CHECK (filled_quantity + remaining_quantity = quantity),
    CONSTRAINT uq_orders_player_idempotency UNIQUE (player_id, idempotency_key)
);

-- 5. TRADES TABLE
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    symbol TEXT NOT NULL,
    maker_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    taker_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES accounts(player_id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES accounts(player_id) ON DELETE RESTRICT,
    price BIGINT NOT NULL CHECK (price > 0),
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    total_amount BIGINT GENERATED ALWAYS AS (price * quantity) STORED,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MARKET STATE TABLE
CREATE TABLE IF NOT EXISTS market_state (
    stock_id UUID PRIMARY KEY REFERENCES stocks(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL UNIQUE,
    last_price BIGINT NOT NULL CHECK (last_price > 0),
    previous_close BIGINT NOT NULL CHECK (previous_close > 0),
    high_24h BIGINT NOT NULL CHECK (high_24h > 0),
    low_24h BIGINT NOT NULL CHECK (low_24h > 0),
    volume_24h BIGINT NOT NULL DEFAULT 0 CHECK (volume_24h >= 0),
    last_trade_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. LEDGER ENTRIES TABLE (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES accounts(player_id) ON DELETE RESTRICT,
    asset_type TEXT NOT NULL, -- 'CASH' or Stock Symbol
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'INITIAL_GRANT',
            'DEPOSIT',
            'WITHDRAW',
            'ORDER_LOCK',
            'ORDER_UNLOCK',
            'TRADE_BUY',
            'TRADE_SELL',
            'PRICE_IMPROVEMENT_REFUND'
        )
    ),
    delta_available BIGINT NOT NULL DEFAULT 0,
    delta_locked BIGINT NOT NULL DEFAULT 0,
    balance_available_after BIGINT NOT NULL CHECK (balance_available_after >= 0),
    balance_locked_after BIGINT NOT NULL CHECK (balance_locked_after >= 0),
    reference_type TEXT NOT NULL, -- 'ORDER', 'TRADE', 'ACCOUNT'
    reference_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent any UPDATE or DELETE on ledger_entries
CREATE OR REPLACE FUNCTION fn_prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is an immutable audit log and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ledger_mutation ON ledger_entries;
CREATE TRIGGER trg_prevent_ledger_mutation
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_ledger_mutation();

-- 8. OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq_no BIGSERIAL NOT NULL,
    aggregate_type TEXT NOT NULL, -- 'MARKET', 'ORDER', 'TRADE'
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,     -- 'market:trade', 'market:book_update', 'market:ticker', 'order:updated'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE & CONCURRENCY
-- ============================================================================

-- Active order book recovery & matching lookup (Price-Time Priority)
CREATE INDEX IF NOT EXISTS idx_orders_active_book_buy
    ON orders (symbol, side, price DESC, seq_no ASC)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND side = 'BUY';

CREATE INDEX IF NOT EXISTS idx_orders_active_book_sell
    ON orders (symbol, side, price ASC, seq_no ASC)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND side = 'SELL';

-- Player order lookups
CREATE INDEX IF NOT EXISTS idx_orders_player_created
    ON orders (player_id, created_at DESC);

-- Trade history by symbol
CREATE INDEX IF NOT EXISTS idx_trades_symbol_executed
    ON trades (symbol, executed_at DESC);

-- Ledger history per player
CREATE INDEX IF NOT EXISTS idx_ledger_player_created
    ON ledger_entries (player_id, created_at DESC);

-- Outbox worker polling index
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (seq_no ASC)
    WHERE status = 'PENDING';


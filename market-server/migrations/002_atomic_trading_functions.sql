-- ============================================================================
-- Migration 002: Atomic Trading Stored Procedures (PL/pgSQL)
-- Implements single-transaction atomic order placement, price-time matching,
-- balance/position locking, immutable ledger logging, and transactional outbox.
-- ============================================================================

-- 1. ENSURE PLAYER ACCOUNT EXISTS
CREATE OR REPLACE FUNCTION fn_ensure_account(
    p_player_id UUID,
    p_username TEXT DEFAULT 'Player',
    p_initial_balance BIGINT DEFAULT 10000000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_account accounts%ROWTYPE;
    v_inserted BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_account
    FROM accounts
    WHERE player_id = p_player_id;

    IF NOT FOUND THEN
        INSERT INTO accounts (player_id, username, available_balance, locked_balance)
        VALUES (p_player_id, COALESCE(p_username, 'Player'), p_initial_balance, 0)
        ON CONFLICT (player_id) DO NOTHING
        RETURNING * INTO v_account;

        IF v_account.player_id IS NOT NULL THEN
            v_inserted := TRUE;
            IF p_initial_balance > 0 THEN
                INSERT INTO ledger_entries (
                    player_id, asset_type, entry_type,
                    delta_available, delta_locked,
                    balance_available_after, balance_locked_after,
                    reference_type, reference_id, metadata
                ) VALUES (
                    p_player_id, 'CASH', 'INITIAL_GRANT',
                    p_initial_balance, 0,
                    p_initial_balance, 0,
                    'ACCOUNT', p_player_id,
                    jsonb_build_object('reason', 'Initial account provisioning')
                );
            END IF;
        ELSE
            SELECT * INTO v_account FROM accounts WHERE player_id = p_player_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'player_id', v_account.player_id,
        'username', v_account.username,
        'available_balance', v_account.available_balance,
        'locked_balance', v_account.locked_balance,
        'created', v_inserted
    );
END;
$$;

-- 2. GRANT OR SEED SHARES TO A PLAYER (FOR INITIAL DISTRIBUTION / IPO / NPC)
CREATE OR REPLACE FUNCTION fn_grant_shares(
    p_player_id UUID,
    p_symbol TEXT,
    p_quantity BIGINT,
    p_price BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock stocks%ROWTYPE;
    v_pos positions%ROWTYPE;
    v_grant_price BIGINT;
    v_new_qty BIGINT;
    v_new_invested BIGINT;
    v_new_avg BIGINT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Grant quantity must be positive';
    END IF;

    SELECT * INTO v_stock FROM stocks WHERE symbol = p_symbol AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock % not found or inactive', p_symbol;
    END IF;

    v_grant_price := COALESCE(p_price, v_stock.base_price);

    SELECT * INTO v_pos
    FROM positions
    WHERE player_id = p_player_id AND stock_id = v_stock.id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO positions (
            player_id, stock_id, symbol,
            available_quantity, locked_quantity,
            avg_buy_price, total_invested
        ) VALUES (
            p_player_id, v_stock.id, v_stock.symbol,
            p_quantity, 0,
            v_grant_price, p_quantity * v_grant_price
        )
        RETURNING * INTO v_pos;
    ELSE
        v_new_qty := v_pos.available_quantity + v_pos.locked_quantity + p_quantity;
        v_new_invested := v_pos.total_invested + (p_quantity * v_grant_price);
        v_new_avg := v_new_invested / v_new_qty;

        UPDATE positions
        SET available_quantity = available_quantity + p_quantity,
            avg_buy_price = v_new_avg,
            total_invested = v_new_invested,
            updated_at = NOW()
        WHERE id = v_pos.id
        RETURNING * INTO v_pos;
    END IF;

    INSERT INTO ledger_entries (
        player_id, asset_type, entry_type,
        delta_available, delta_locked,
        balance_available_after, balance_locked_after,
        reference_type, reference_id, metadata
    ) VALUES (
        p_player_id, v_stock.symbol, 'INITIAL_GRANT',
        p_quantity, 0,
        v_pos.available_quantity, v_pos.locked_quantity,
        'ACCOUNT', p_player_id,
        jsonb_build_object('symbol', v_stock.symbol, 'grant_price', v_grant_price)
    );

    RETURN jsonb_build_object(
        'player_id', p_player_id,
        'symbol', v_stock.symbol,
        'available_quantity', v_pos.available_quantity,
        'locked_quantity', v_pos.locked_quantity,
        'avg_buy_price', v_pos.avg_buy_price
    );
END;
$$;

-- 3. ATOMIC ORDER PLACEMENT & PRICE-TIME PRIORITY MATCHING
CREATE OR REPLACE FUNCTION fn_execute_order_atomic(
    p_player_id UUID,
    p_symbol TEXT,
    p_side TEXT,
    p_type TEXT,
    p_price BIGINT,
    p_quantity BIGINT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_order orders%ROWTYPE;
    v_stock stocks%ROWTYPE;
    v_taker_account accounts%ROWTYPE;
    v_taker_pos positions%ROWTYPE;
    v_taker_order orders%ROWTYPE;
    v_maker_order RECORD;
    v_maker_account accounts%ROWTYPE;
    v_maker_pos positions%ROWTYPE;
    v_buyer_pos positions%ROWTYPE;
    v_seller_pos positions%ROWTYPE;
    v_market_state market_state%ROWTYPE;
    v_trade trades%ROWTYPE;

    v_required_funds BIGINT := 0;
    v_available_book_qty BIGINT := 0;
    v_estimated_market_cost BIGINT := 0;
    v_rem_sim BIGINT := 0;
    v_sim_qty BIGINT := 0;

    v_remaining_qty BIGINT;
    v_filled_qty BIGINT := 0;
    v_match_qty BIGINT;
    v_exec_price BIGINT;
    v_trade_cost BIGINT;
    v_price_refund BIGINT := 0;
    v_final_status TEXT;

    v_new_total_shares BIGINT;
    v_new_total_invested BIGINT;
    v_new_avg_price BIGINT;
    v_seller_remaining_total BIGINT;

    v_trades_json JSONB := '[]'::jsonb;
    v_updated_makers_json JSONB := '[]'::jsonb;
BEGIN
    -- A. Basic input checks
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: Order quantity must be positive';
    END IF;

    IF p_side NOT IN ('BUY', 'SELL') THEN
        RAISE EXCEPTION 'INVALID_SIDE: Side must be BUY or SELL';
    END IF;

    IF p_type NOT IN ('LIMIT', 'MARKET') THEN
        RAISE EXCEPTION 'INVALID_TYPE: Order type must be LIMIT or MARKET';
    END IF;

    IF p_idempotency_key IS NULL OR LENGTH(TRIM(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: Idempotency key is required';
    END IF;

    -- B. Acquire per-symbol transaction advisory lock to serialize concurrent orders on same stock
    PERFORM pg_advisory_xact_lock(hashtext('stock_orderbook_' || UPPER(TRIM(p_symbol))));

    -- C. Idempotency check (safe under advisory lock)
    SELECT * INTO v_existing_order
    FROM orders
    WHERE player_id = p_player_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'idempotent_replay', TRUE,
            'order', row_to_json(v_existing_order)::jsonb,
            'trades', '[]'::jsonb,
            'updated_maker_orders', '[]'::jsonb
        );
    END IF;

    -- D. Validate stock & tick size
    SELECT * INTO v_stock
    FROM stocks
    WHERE symbol = UPPER(TRIM(p_symbol)) AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'STOCK_NOT_FOUND: Stock % does not exist or is inactive', p_symbol;
    END IF;

    IF (p_quantity % v_stock.lot_size) <> 0 THEN
        RAISE EXCEPTION 'INVALID_LOT_SIZE: Quantity % must be a multiple of lot size %', p_quantity, v_stock.lot_size;
    END IF;

    IF p_type = 'LIMIT' THEN
        IF p_price IS NULL OR p_price <= 0 THEN
            RAISE EXCEPTION 'INVALID_PRICE: Limit order requires a positive price';
        END IF;
        IF (p_price % v_stock.tick_size) <> 0 THEN
            RAISE EXCEPTION 'INVALID_TICK_SIZE: Price % must be a multiple of tick size %', p_price, v_stock.tick_size;
        END IF;
    ELSE
        p_price := NULL;
    END IF;

    -- E. Lock Taker Account
    SELECT * INTO v_taker_account
    FROM accounts
    WHERE player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACCOUNT_NOT_FOUND: Player account % not found', p_player_id;
    END IF;

    -- F. Pre-validate Liquidity (for MARKET orders) and Lock Funds / Shares
    IF p_side = 'BUY' THEN
        IF p_type = 'LIMIT' THEN
            v_required_funds := p_price * p_quantity;
        ELSE
            -- Calculate exact liquidity and cost for Market Buy (Fill-or-Kill / Strict Market Validation)
            v_rem_sim := p_quantity;
            FOR v_maker_order IN
                SELECT id, price, remaining_quantity
                FROM orders
                WHERE stock_id = v_stock.id
                  AND side = 'SELL'
                  AND status IN ('OPEN', 'PARTIALLY_FILLED')
                  AND player_id <> p_player_id
                ORDER BY price ASC, seq_no ASC
            LOOP
                EXIT WHEN v_rem_sim <= 0;
                v_sim_qty := LEAST(v_rem_sim, v_maker_order.remaining_quantity);
                v_available_book_qty := v_available_book_qty + v_sim_qty;
                v_estimated_market_cost := v_estimated_market_cost + (v_sim_qty * v_maker_order.price);
                v_rem_sim := v_rem_sim - v_sim_qty;
            END LOOP;

            IF v_available_book_qty < p_quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_LIQUIDITY: Market BUY requires % shares, only % available on order book',
                    p_quantity, v_available_book_qty;
            END IF;

            v_required_funds := v_estimated_market_cost;
        END IF;

        IF v_taker_account.available_balance < v_required_funds THEN
            RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Required %, available %',
                v_required_funds, v_taker_account.available_balance;
        END IF;

        -- Lock buyer funds
        UPDATE accounts
        SET available_balance = available_balance - v_required_funds,
            locked_balance = locked_balance + v_required_funds,
            version = version + 1,
            updated_at = NOW()
        WHERE player_id = p_player_id
        RETURNING * INTO v_taker_account;

    ELSE
        -- SELL ORDER: Validate shares ownership
        SELECT * INTO v_taker_pos
        FROM positions
        WHERE player_id = p_player_id AND stock_id = v_stock.id
        FOR UPDATE;

        IF NOT FOUND OR v_taker_pos.available_quantity < p_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_SHARES: Required % shares of %, available %',
                p_quantity, v_stock.symbol, COALESCE(v_taker_pos.available_quantity, 0);
        END IF;

        IF p_type = 'MARKET' THEN
            SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_available_book_qty
            FROM orders
            WHERE stock_id = v_stock.id
              AND side = 'BUY'
              AND status IN ('OPEN', 'PARTIALLY_FILLED')
              AND player_id <> p_player_id;

            IF v_available_book_qty < p_quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_LIQUIDITY: Market SELL requires % shares, only % bid liquidity available',
                    p_quantity, v_available_book_qty;
            END IF;
        END IF;

        -- Lock seller shares
        UPDATE positions
        SET available_quantity = available_quantity - p_quantity,
            locked_quantity = locked_quantity + p_quantity,
            updated_at = NOW()
        WHERE id = v_taker_pos.id
        RETURNING * INTO v_taker_pos;
    END IF;

    -- G. Insert Taker Order in OPEN state
    INSERT INTO orders (
        player_id, stock_id, symbol, side, type,
        price, quantity, filled_quantity, remaining_quantity,
        locked_funds, status, idempotency_key
    ) VALUES (
        p_player_id, v_stock.id, v_stock.symbol, p_side, p_type,
        p_price, p_quantity, 0, p_quantity,
        v_required_funds, 'OPEN', p_idempotency_key
    )
    RETURNING * INTO v_taker_order;

    -- Record ORDER_LOCK in immutable ledger
    IF p_side = 'BUY' THEN
        INSERT INTO ledger_entries (
            player_id, asset_type, entry_type,
            delta_available, delta_locked,
            balance_available_after, balance_locked_after,
            reference_type, reference_id, metadata
        ) VALUES (
            p_player_id, 'CASH', 'ORDER_LOCK',
            -v_required_funds, v_required_funds,
            v_taker_account.available_balance, v_taker_account.locked_balance,
            'ORDER', v_taker_order.id,
            jsonb_build_object('symbol', v_stock.symbol, 'side', 'BUY', 'type', p_type, 'quantity', p_quantity, 'price', p_price)
        );
    ELSE
        INSERT INTO ledger_entries (
            player_id, asset_type, entry_type,
            delta_available, delta_locked,
            balance_available_after, balance_locked_after,
            reference_type, reference_id, metadata
        ) VALUES (
            p_player_id, v_stock.symbol, 'ORDER_LOCK',
            -p_quantity, p_quantity,
            v_taker_pos.available_quantity, v_taker_pos.locked_quantity,
            'ORDER', v_taker_order.id,
            jsonb_build_object('symbol', v_stock.symbol, 'side', 'SELL', 'type', p_type, 'quantity', p_quantity, 'price', p_price)
        );
    END IF;

    -- H. Continuous Limit Order Book Matching Loop (Price-Time Priority)
    v_remaining_qty := p_quantity;

    IF p_side = 'BUY' THEN
        -- Taker is BUYING -> Match against Resting SELL Orders (lowest price first, then oldest seq_no)
        FOR v_maker_order IN
            SELECT *
            FROM orders
            WHERE stock_id = v_stock.id
              AND side = 'SELL'
              AND status IN ('OPEN', 'PARTIALLY_FILLED')
              AND player_id <> p_player_id
              AND (p_type = 'MARKET' OR price <= p_price)
            ORDER BY price ASC, seq_no ASC
            FOR UPDATE
        LOOP
            EXIT WHEN v_remaining_qty <= 0;

            v_match_qty := LEAST(v_remaining_qty, v_maker_order.remaining_quantity);
            v_exec_price := v_maker_order.price; -- Maker price rule
            v_trade_cost := v_match_qty * v_exec_price;

            -- Price improvement refund if Taker placed LIMIT BUY at higher price than Maker SELL
            IF p_type = 'LIMIT' AND p_price > v_exec_price THEN
                v_price_refund := (p_price - v_exec_price) * v_match_qty;
            ELSE
                v_price_refund := 0;
            END IF;

            -- 1. Settle Buyer (Taker) Cash
            UPDATE accounts
            SET locked_balance = locked_balance - v_trade_cost - v_price_refund,
                available_balance = available_balance + v_price_refund,
                version = version + 1,
                updated_at = NOW()
            WHERE player_id = p_player_id
            RETURNING * INTO v_taker_account;

            -- 2. Settle Seller (Maker) Cash
            UPDATE accounts
            SET available_balance = available_balance + v_trade_cost,
                version = version + 1,
                updated_at = NOW()
            WHERE player_id = v_maker_order.player_id
            RETURNING * INTO v_maker_account;

            -- 3. Settle Seller (Maker) Position (deduct locked shares)
            SELECT * INTO v_seller_pos
            FROM positions
            WHERE player_id = v_maker_order.player_id AND stock_id = v_stock.id
            FOR UPDATE;

            v_seller_remaining_total := (v_seller_pos.available_quantity + v_seller_pos.locked_quantity) - v_match_qty;
            UPDATE positions
            SET locked_quantity = locked_quantity - v_match_qty,
                total_invested = CASE
                    WHEN v_seller_remaining_total <= 0 THEN 0
                    ELSE GREATEST(0, total_invested - (avg_buy_price * v_match_qty))
                END,
                avg_buy_price = CASE
                    WHEN v_seller_remaining_total <= 0 THEN 0
                    ELSE avg_buy_price
                END,
                updated_at = NOW()
            WHERE id = v_seller_pos.id
            RETURNING * INTO v_seller_pos;

            -- 4. Settle Buyer (Taker) Position (credit available shares)
            SELECT * INTO v_buyer_pos
            FROM positions
            WHERE player_id = p_player_id AND stock_id = v_stock.id
            FOR UPDATE;

            IF NOT FOUND THEN
                INSERT INTO positions (
                    player_id, stock_id, symbol,
                    available_quantity, locked_quantity,
                    avg_buy_price, total_invested
                ) VALUES (
                    p_player_id, v_stock.id, v_stock.symbol,
                    v_match_qty, 0,
                    v_exec_price, v_trade_cost
                )
                RETURNING * INTO v_buyer_pos;
            ELSE
                v_new_total_shares := v_buyer_pos.available_quantity + v_buyer_pos.locked_quantity + v_match_qty;
                v_new_total_invested := v_buyer_pos.total_invested + v_trade_cost;
                v_new_avg_price := v_new_total_invested / v_new_total_shares;

                UPDATE positions
                SET available_quantity = available_quantity + v_match_qty,
                    avg_buy_price = v_new_avg_price,
                    total_invested = v_new_total_invested,
                    updated_at = NOW()
                WHERE id = v_buyer_pos.id
                RETURNING * INTO v_buyer_pos;
            END IF;

            -- 5. Update Maker Order
            UPDATE orders
            SET filled_quantity = filled_quantity + v_match_qty,
                remaining_quantity = remaining_quantity - v_match_qty,
                status = CASE WHEN (remaining_quantity - v_match_qty) = 0 THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END,
                updated_at = NOW()
            WHERE id = v_maker_order.id
            RETURNING * INTO v_maker_order;

            -- 6. Insert Trade Record
            INSERT INTO trades (
                stock_id, symbol, maker_order_id, taker_order_id,
                buyer_id, seller_id, price, quantity
            ) VALUES (
                v_stock.id, v_stock.symbol, v_maker_order.id, v_taker_order.id,
                p_player_id, v_maker_order.player_id, v_exec_price, v_match_qty
            )
            RETURNING * INTO v_trade;

            -- 7. Insert Immutable Ledger Entries
            -- Buyer Cash Deduct
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                p_player_id, 'CASH', 'TRADE_BUY',
                0, -v_trade_cost,
                v_taker_account.available_balance - v_price_refund, v_taker_account.locked_balance + v_price_refund,
                'TRADE', v_trade.id,
                jsonb_build_object('symbol', v_stock.symbol, 'price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_taker_order.id)
            );

            -- Buyer Price Improvement Refund (if any)
            IF v_price_refund > 0 THEN
                INSERT INTO ledger_entries (
                    player_id, asset_type, entry_type,
                    delta_available, delta_locked,
                    balance_available_after, balance_locked_after,
                    reference_type, reference_id, metadata
                ) VALUES (
                    p_player_id, 'CASH', 'PRICE_IMPROVEMENT_REFUND',
                    v_price_refund, -v_price_refund,
                    v_taker_account.available_balance, v_taker_account.locked_balance,
                    'TRADE', v_trade.id,
                    jsonb_build_object('symbol', v_stock.symbol, 'limit_price', p_price, 'exec_price', v_exec_price, 'quantity', v_match_qty)
                );
            END IF;

            -- Buyer Stock Credit
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                p_player_id, v_stock.symbol, 'TRADE_BUY',
                v_match_qty, 0,
                v_buyer_pos.available_quantity, v_buyer_pos.locked_quantity,
                'TRADE', v_trade.id,
                jsonb_build_object('price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_taker_order.id)
            );

            -- Seller Cash Credit
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                v_maker_order.player_id, 'CASH', 'TRADE_SELL',
                v_trade_cost, 0,
                v_maker_account.available_balance, v_maker_account.locked_balance,
                'TRADE', v_trade.id,
                jsonb_build_object('symbol', v_stock.symbol, 'price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_maker_order.id)
            );

            -- Seller Stock Deduct
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                v_maker_order.player_id, v_stock.symbol, 'TRADE_SELL',
                0, -v_match_qty,
                v_seller_pos.available_quantity, v_seller_pos.locked_quantity,
                'TRADE', v_trade.id,
                jsonb_build_object('price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_maker_order.id)
            );

            -- 8. Update Market State
            UPDATE market_state
            SET last_price = v_exec_price,
                high_24h = GREATEST(high_24h, v_exec_price),
                low_24h = LEAST(low_24h, v_exec_price),
                volume_24h = volume_24h + v_match_qty,
                last_trade_at = v_trade.executed_at,
                updated_at = NOW()
            WHERE stock_id = v_stock.id
            RETURNING * INTO v_market_state;

            -- 9. Queue Outbox Events for Trade & Maker Order Update
            INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
            VALUES (
                'TRADE', v_trade.id::text, 'market:trade',
                jsonb_build_object(
                    'id', v_trade.id,
                    'symbol', v_stock.symbol,
                    'price', v_trade.price,
                    'quantity', v_trade.quantity,
                    'total_amount', v_trade.total_amount,
                    'maker_order_id', v_trade.maker_order_id,
                    'taker_order_id', v_trade.taker_order_id,
                    'buyer_id', v_trade.buyer_id,
                    'seller_id', v_trade.seller_id,
                    'taker_side', 'BUY',
                    'executed_at', v_trade.executed_at
                )
            );

            INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
            VALUES (
                'ORDER', v_maker_order.id::text, 'order:updated',
                row_to_json(v_maker_order)::jsonb
            );

            v_trades_json := v_trades_json || jsonb_build_array(row_to_json(v_trade)::jsonb);
            v_updated_makers_json := v_updated_makers_json || jsonb_build_array(row_to_json(v_maker_order)::jsonb);

            v_remaining_qty := v_remaining_qty - v_match_qty;
            v_filled_qty := v_filled_qty + v_match_qty;
            v_required_funds := v_required_funds - v_trade_cost - v_price_refund;
        END LOOP;

    ELSE
        -- Taker is SELLING -> Match against Resting BUY Orders (highest price first, then oldest seq_no)
        FOR v_maker_order IN
            SELECT *
            FROM orders
            WHERE stock_id = v_stock.id
              AND side = 'BUY'
              AND status IN ('OPEN', 'PARTIALLY_FILLED')
              AND player_id <> p_player_id
              AND (p_type = 'MARKET' OR price >= p_price)
            ORDER BY price DESC, seq_no ASC
            FOR UPDATE
        LOOP
            EXIT WHEN v_remaining_qty <= 0;

            v_match_qty := LEAST(v_remaining_qty, v_maker_order.remaining_quantity);
            v_exec_price := v_maker_order.price; -- Maker price rule
            v_trade_cost := v_match_qty * v_exec_price;

            -- 1. Settle Buyer (Maker) Cash (deduct from Maker's locked_balance)
            UPDATE accounts
            SET locked_balance = locked_balance - v_trade_cost,
                version = version + 1,
                updated_at = NOW()
            WHERE player_id = v_maker_order.player_id
            RETURNING * INTO v_maker_account;

            -- 2. Settle Seller (Taker) Cash (credit Taker's available_balance)
            UPDATE accounts
            SET available_balance = available_balance + v_trade_cost,
                version = version + 1,
                updated_at = NOW()
            WHERE player_id = p_player_id
            RETURNING * INTO v_taker_account;

            -- 3. Settle Seller (Taker) Position (deduct from Taker's locked_quantity)
            v_seller_remaining_total := (v_taker_pos.available_quantity + v_taker_pos.locked_quantity) - v_match_qty;
            UPDATE positions
            SET locked_quantity = locked_quantity - v_match_qty,
                total_invested = CASE
                    WHEN v_seller_remaining_total <= 0 THEN 0
                    ELSE GREATEST(0, total_invested - (avg_buy_price * v_match_qty))
                END,
                avg_buy_price = CASE
                    WHEN v_seller_remaining_total <= 0 THEN 0
                    ELSE avg_buy_price
                END,
                updated_at = NOW()
            WHERE id = v_taker_pos.id
            RETURNING * INTO v_taker_pos;

            -- 4. Settle Buyer (Maker) Position (credit Maker's available_quantity)
            SELECT * INTO v_buyer_pos
            FROM positions
            WHERE player_id = v_maker_order.player_id AND stock_id = v_stock.id
            FOR UPDATE;

            IF NOT FOUND THEN
                INSERT INTO positions (
                    player_id, stock_id, symbol,
                    available_quantity, locked_quantity,
                    avg_buy_price, total_invested
                ) VALUES (
                    v_maker_order.player_id, v_stock.id, v_stock.symbol,
                    v_match_qty, 0,
                    v_exec_price, v_trade_cost
                )
                RETURNING * INTO v_buyer_pos;
            ELSE
                v_new_total_shares := v_buyer_pos.available_quantity + v_buyer_pos.locked_quantity + v_match_qty;
                v_new_total_invested := v_buyer_pos.total_invested + v_trade_cost;
                v_new_avg_price := v_new_total_invested / v_new_total_shares;

                UPDATE positions
                SET available_quantity = available_quantity + v_match_qty,
                    avg_buy_price = v_new_avg_price,
                    total_invested = v_new_total_invested,
                    updated_at = NOW()
                WHERE id = v_buyer_pos.id
                RETURNING * INTO v_buyer_pos;
            END IF;

            -- 5. Update Maker Order
            UPDATE orders
            SET filled_quantity = filled_quantity + v_match_qty,
                remaining_quantity = remaining_quantity - v_match_qty,
                locked_funds = locked_funds - v_trade_cost,
                status = CASE WHEN (remaining_quantity - v_match_qty) = 0 THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END,
                updated_at = NOW()
            WHERE id = v_maker_order.id
            RETURNING * INTO v_maker_order;

            -- 6. Insert Trade Record
            INSERT INTO trades (
                stock_id, symbol, maker_order_id, taker_order_id,
                buyer_id, seller_id, price, quantity
            ) VALUES (
                v_stock.id, v_stock.symbol, v_maker_order.id, v_taker_order.id,
                v_maker_order.player_id, p_player_id, v_exec_price, v_match_qty
            )
            RETURNING * INTO v_trade;

            -- 7. Insert Immutable Ledger Entries
            -- Buyer (Maker) Cash Deduct
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                v_maker_order.player_id, 'CASH', 'TRADE_BUY',
                0, -v_trade_cost,
                v_maker_account.available_balance, v_maker_account.locked_balance,
                'TRADE', v_trade.id,
                jsonb_build_object('symbol', v_stock.symbol, 'price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_maker_order.id)
            );

            -- Buyer (Maker) Stock Credit
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                v_maker_order.player_id, v_stock.symbol, 'TRADE_BUY',
                v_match_qty, 0,
                v_buyer_pos.available_quantity, v_buyer_pos.locked_quantity,
                'TRADE', v_trade.id,
                jsonb_build_object('price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_maker_order.id)
            );

            -- Seller (Taker) Cash Credit
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                p_player_id, 'CASH', 'TRADE_SELL',
                v_trade_cost, 0,
                v_taker_account.available_balance, v_taker_account.locked_balance,
                'TRADE', v_trade.id,
                jsonb_build_object('symbol', v_stock.symbol, 'price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_taker_order.id)
            );

            -- Seller (Taker) Stock Deduct
            INSERT INTO ledger_entries (
                player_id, asset_type, entry_type,
                delta_available, delta_locked,
                balance_available_after, balance_locked_after,
                reference_type, reference_id, metadata
            ) VALUES (
                p_player_id, v_stock.symbol, 'TRADE_SELL',
                0, -v_match_qty,
                v_taker_pos.available_quantity, v_taker_pos.locked_quantity,
                'TRADE', v_trade.id,
                jsonb_build_object('price', v_exec_price, 'quantity', v_match_qty, 'order_id', v_taker_order.id)
            );

            -- 8. Update Market State
            UPDATE market_state
            SET last_price = v_exec_price,
                high_24h = GREATEST(high_24h, v_exec_price),
                low_24h = LEAST(low_24h, v_exec_price),
                volume_24h = volume_24h + v_match_qty,
                last_trade_at = v_trade.executed_at,
                updated_at = NOW()
            WHERE stock_id = v_stock.id
            RETURNING * INTO v_market_state;

            -- 9. Queue Outbox Events
            INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
            VALUES (
                'TRADE', v_trade.id::text, 'market:trade',
                jsonb_build_object(
                    'id', v_trade.id,
                    'symbol', v_stock.symbol,
                    'price', v_trade.price,
                    'quantity', v_trade.quantity,
                    'total_amount', v_trade.total_amount,
                    'maker_order_id', v_trade.maker_order_id,
                    'taker_order_id', v_trade.taker_order_id,
                    'buyer_id', v_trade.buyer_id,
                    'seller_id', v_trade.seller_id,
                    'taker_side', 'SELL',
                    'executed_at', v_trade.executed_at
                )
            );

            INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
            VALUES (
                'ORDER', v_maker_order.id::text, 'order:updated',
                row_to_json(v_maker_order)::jsonb
            );

            v_trades_json := v_trades_json || jsonb_build_array(row_to_json(v_trade)::jsonb);
            v_updated_makers_json := v_updated_makers_json || jsonb_build_array(row_to_json(v_maker_order)::jsonb);

            v_remaining_qty := v_remaining_qty - v_match_qty;
            v_filled_qty := v_filled_qty + v_match_qty;
        END LOOP;
    END IF;

    -- I. Finalize Taker Order Status
    IF v_remaining_qty = 0 THEN
        v_final_status := 'FILLED';
    ELSIF v_filled_qty > 0 THEN
        v_final_status := 'PARTIALLY_FILLED';
    ELSE
        v_final_status := 'OPEN';
    END IF;

    UPDATE orders
    SET filled_quantity = v_filled_qty,
        remaining_quantity = v_remaining_qty,
        locked_funds = CASE WHEN p_side = 'BUY' THEN v_required_funds ELSE 0 END,
        status = v_final_status,
        updated_at = NOW()
    WHERE id = v_taker_order.id
    RETURNING * INTO v_taker_order;

    -- Queue Taker Order Update & Market Book/Ticker Events
    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        'ORDER', v_taker_order.id::text, 'order:updated',
        row_to_json(v_taker_order)::jsonb
    );

    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        'MARKET', v_stock.symbol, 'market:book_update',
        jsonb_build_object(
            'symbol', v_stock.symbol,
            'trigger_order_id', v_taker_order.id,
            'timestamp', NOW()
        )
    );

    IF v_filled_qty > 0 THEN
        INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
        VALUES (
            'MARKET', v_stock.symbol, 'market:ticker',
            row_to_json(v_market_state)::jsonb
        );
    END IF;

    RETURN jsonb_build_object(
        'idempotent_replay', FALSE,
        'order', row_to_json(v_taker_order)::jsonb,
        'trades', v_trades_json,
        'updated_maker_orders', v_updated_makers_json,
        'market_state', CASE WHEN v_filled_qty > 0 THEN row_to_json(v_market_state)::jsonb ELSE NULL END
    );
END;
$$;

-- 4. ATOMIC ORDER CANCELLATION
CREATE OR REPLACE FUNCTION fn_cancel_order_atomic(
    p_order_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_account accounts%ROWTYPE;
    v_pos positions%ROWTYPE;
    v_unlock_funds BIGINT := 0;
    v_unlock_shares BIGINT := 0;
BEGIN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
    END IF;

    IF v_order.player_id <> p_player_id THEN
        RAISE EXCEPTION 'FORBIDDEN: Order % does not belong to player %', p_order_id, p_player_id;
    END IF;

    -- Serialize with symbol order book
    PERFORM pg_advisory_xact_lock(hashtext('stock_orderbook_' || v_order.symbol));

    -- Re-fetch with row lock
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.status NOT IN ('OPEN', 'PARTIALLY_FILLED') THEN
        RAISE EXCEPTION 'ORDER_NOT_ACTIVE: Cannot cancel order in status %', v_order.status;
    END IF;

    IF v_order.side = 'BUY' THEN
        v_unlock_funds := v_order.locked_funds;

        UPDATE accounts
        SET available_balance = available_balance + v_unlock_funds,
            locked_balance = locked_balance - v_unlock_funds,
            version = version + 1,
            updated_at = NOW()
        WHERE player_id = p_player_id
        RETURNING * INTO v_account;

        INSERT INTO ledger_entries (
            player_id, asset_type, entry_type,
            delta_available, delta_locked,
            balance_available_after, balance_locked_after,
            reference_type, reference_id, metadata
        ) VALUES (
            p_player_id, 'CASH', 'ORDER_UNLOCK',
            v_unlock_funds, -v_unlock_funds,
            v_account.available_balance, v_account.locked_balance,
            'ORDER', v_order.id,
            jsonb_build_object('symbol', v_order.symbol, 'reason', 'ORDER_CANCELLED')
        );
    ELSE
        v_unlock_shares := v_order.remaining_quantity;

        UPDATE positions
        SET available_quantity = available_quantity + v_unlock_shares,
            locked_quantity = locked_quantity - v_unlock_shares,
            updated_at = NOW()
        WHERE player_id = p_player_id AND stock_id = v_order.stock_id
        RETURNING * INTO v_pos;

        INSERT INTO ledger_entries (
            player_id, asset_type, entry_type,
            delta_available, delta_locked,
            balance_available_after, balance_locked_after,
            reference_type, reference_id, metadata
        ) VALUES (
            p_player_id, v_order.symbol, 'ORDER_UNLOCK',
            v_unlock_shares, -v_unlock_shares,
            v_pos.available_quantity, v_pos.locked_quantity,
            'ORDER', v_order.id,
            jsonb_build_object('symbol', v_order.symbol, 'reason', 'ORDER_CANCELLED')
        );
    END IF;

    UPDATE orders
    SET status = 'CANCELLED',
        locked_funds = 0,
        updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;

    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        'ORDER', v_order.id::text, 'order:updated',
        row_to_json(v_order)::jsonb
    );

    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        'MARKET', v_order.symbol, 'market:book_update',
        jsonb_build_object(
            'symbol', v_order.symbol,
            'trigger_order_id', v_order.id,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'order', row_to_json(v_order)::jsonb,
        'unlocked_funds', v_unlock_funds,
        'unlocked_shares', v_unlock_shares
    );
END;
$$;


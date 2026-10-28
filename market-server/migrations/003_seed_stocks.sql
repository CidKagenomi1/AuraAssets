-- ============================================================================
-- Migration 003: Seed Core Stocks & Initial Market State
-- Prices are stored in minor integer units (1 unit = $0.01 / 1 cent, PRICE_SCALE = 100)
-- ============================================================================

INSERT INTO stocks (symbol, name, sector, tick_size, lot_size, base_price, shares_outstanding)
VALUES
    ('AAPL',  'Apple Inc.',                         'Technology',             1, 1, 18050,  15500000000),
    ('MSFT',  'Microsoft Corporation',              'Technology',             1, 1, 42025,  7450000000),
    ('AMZN',  'Amazon.com Inc.',                    'Consumer Cyclical',      1, 1, 17580,  10500000000),
    ('NVDA',  'NVIDIA Corporation',                 'Technology',             1, 1, 85000,  24500000000),
    ('GOOGL', 'Alphabet Inc. (Class A)',            'Technology',             1, 1, 15030,  12200000000),
    ('META',  'Meta Platforms Inc.',                'Technology',             1, 1, 49510,  2550000000),
    ('TSLA',  'Tesla Inc.',                         'Consumer Cyclical',      1, 1, 17520,  3200000000),
    ('BRK.B', 'Berkshire Hathaway Inc.',            'Financial Services',     1, 1, 40560,  2200000000),
    ('LLY',   'Eli Lilly and Company',              'Healthcare',             1, 1, 76040,  900000000),
    ('AVGO',  'Broadcom Inc.',                      'Technology',             1, 1, 130000, 500000000),
    ('JPM',   'JPMorgan Chase & Co.',               'Financial Services',     1, 1, 19530,  2900000000),
    ('V',     'Visa Inc.',                          'Financial Services',     1, 1, 27515,  1700000000),
    ('UNH',   'UnitedHealth Group Incorporated',    'Healthcare',             1, 1, 49080,  920000000),
    ('XOM',   'Exxon Mobil Corporation',            'Energy',                 1, 1, 11850,  4100000000),
    ('MA',    'Mastercard Incorporated',            'Financial Services',     1, 1, 46020,  980000000),
    ('JNJ',   'Johnson & Johnson',                  'Healthcare',             1, 1, 15540,  2400000000),
    ('AMD',   'Advanced Micro Devices Inc.',        'Technology',             1, 1, 17040,  1620000000),
    ('NFLX',  'Netflix Inc.',                       'Consumer Cyclical',      1, 1, 61030,  430000000),
    ('INTC',  'Intel Corporation',                  'Technology',             1, 1, 3560,   4200000000),
    ('BAC',   'Bank of America Corporation',        'Financial Services',     1, 1, 3720,   7900000000)
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO market_state (stock_id, symbol, last_price, previous_close, high_24h, low_24h, volume_24h)
SELECT
    s.id,
    s.symbol,
    s.base_price,
    s.base_price,
    s.base_price,
    s.base_price,
    0
FROM stocks s
ON CONFLICT (stock_id) DO NOTHING;


# AuraAssets 💼📈

An advanced, dark-themed **Idle Financial Portfolio & Enterprise Simulation Game** designed to simulate real-world financial systems, career ladders, investment markets, and corporate governance. Experience the journey from unemployment to becoming an industry tycoon.

> **Note:** AuraAssets is a client-side Single Page Application (SPA) utilizing a modern glassmorphism design system, now equipped with an **Authoritative Multiplayer Market Engine (`market-server/`)** powered by Fastify, Socket.IO, and Supabase PostgreSQL.

---

## 🎮 Gameplay Features

### 1. 📈 Financial & Investment Markets
- **Stock Market (Authoritative & Local Fallback):** Real-time stock price fluctuations and continuous limit order book matching (Price-Time Priority / FIFO). Buy/sell shares using Market or Limit orders with automatic price improvement refunds.
- **Investor Risk Profile Assessment:** Interactive onboarding questionnaire that evaluates player behavior and classifies them into **Investor Konservatif** (🛡️), **Investor Pasif** (⚖️), or **Investor Agresif** (🚀), launching directly into the Trading Dashboard.
- **Cryptocurrency Exchange:** Trade volatile digital assets with high risk and high reward profiles.
- **Trading Signals:** Leverage AI-powered technical indicators and market analysis reports to formulate your investment strategies.

### 2. 🏢 Enterprise & Corporate Operations
- **Sectors:** Build and manage businesses in 8 distinct industries: Tech, Aerospace, Energy, Finance, Healthcare, Infrastructure, Retail, and Automotive.
- **Corporate Governance:** Purchase subsidiaries, hire staff, manage operational budgets, and adjust executive salaries.
- **Going Public (IPO):** Scale your enterprise, meet listing criteria, and launch an Initial Public Offering (IPO) to trade on the public stock exchange.
- **AI Competitors:** Navigate a dynamic market with rival corporations competing for market share.

### 3. 🏠 Real Estate & Wealth Management
- **Aset Properti:** Buy, hold, and sell residential and commercial real estate properties for passive rental income and capital appreciation.
- **Banking System:** Secure capital through bank loans or park your excess cash in high-yield time deposits.
- **Taxation (Perpajakan):** File monthly tax reports, declare income/assets, and manage corporate tax rates to stay compliant.

### 4. 👔 Career Progression & Office Simulation
- **Office Dashboard:** Perform daily office tasks to earn standard wages.
- **Career Path:** Improve personal skills, apply for corporate promotions, and negotiate salary increases to build your seed capital.

---

## 🛠️ Tech Stack

### Frontend (`src/`)
- **Markup:** Semantic HTML5
- **Styling:** Custom Vanilla CSS3 (features a premium Dark/Glassmorphic dashboard theme with micro-animations)
- **Logic:** Vanilla JavaScript (ES6+ Modular architecture)
- **Visualizations & Charts:** Chart.js & ECharts (for drawing economic trends and trading asset histories)
- **Real-Time Client:** `socket.io-client` & `@supabase/supabase-js` (`MarketClient.js`)
- **Bundler & Server:** Vite 5.x

### Backend Authoritative Market Engine (`market-server/`)
- **Runtime & HTTP API:** Node.js LTS + Fastify
- **Real-Time Events:** Socket.IO + Transactional Outbox Worker (`FOR UPDATE SKIP LOCKED`)
- **Database & Atomic Settlement:** Supabase PostgreSQL (`BIGINT` minor currency units, PL/pgSQL atomic functions `fn_execute_order_atomic` & `fn_cancel_order_atomic`, immutable `ledger_entries` audit log)
- **Authentication & Validation:** Supabase Auth JWT (`jose`) & Zod schema validation
- **Testing Framework:** Vitest

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v20+ LTS recommended) installed on your machine.

### Installation
1. Clone this repository or download the source files.
2. Install frontend dependencies in the root directory:
   ```bash
   cd AuraAssets
   npm install
   ```
3. *(Optional - Multiplayer Market Engine)* Install backend dependencies:
   ```bash
   cd market-server
   npm install
   ```

### Running Locally
Start the Vite frontend development server:
```bash
npm run dev
```
Open the local server URL (usually `http://localhost:5173`) in your web browser.

To run the authoritative market server (once `market-server/.env` is configured):
```bash
cd market-server
npm run migrate
npm run dev
```

### Building for Production
Bundle the project for production deployment:
```bash
npm run build
```
The output files will be built into the `dist/` directory, ready to be served by any static host (GitHub Pages, Vercel, Netlify, etc.).

---

## 📂 Project Structure

```text
AuraAssets/
├── index.html              # Application entry point and layout shell
├── package.json            # Frontend Node metadata and dependencies
├── vite.config.js          # Vite configuration file
├── Implamantation plan.md  # Authoritative Market Engine architecture & progress checklist
├── src/
│   ├── styles/             # Curated stylesheets (main, components, trading, compact, mobile)
│   └── js/
│       ├── main.js         # Game entry point, Risk Assessment onboarding, & master orchestration
│       ├── core/           # GameState, TimeManager, GlobalEconomy, RoleManager (Risk Profiles)
│       ├── finance/        # Core engines: FinanceManager, BankSystem, SavingsManager, TaxSystem
│       ├── property/       # Real estate management and property panel
│       ├── trading/        # StockMarket, MarketClient, CryptoMarket, PassiveIncome, ChartEngine, TradingPage
│       ├── marketplace/    # Luxury status goods, watches, and portfolio boosters
│       └── ui/             # ViewManager, HomeScreen, LoginPortal, KeyboardNav, UIManager
├── market-server/          # Authoritative Multiplayer Stock Market Backend
│   ├── migrations/         # PostgreSQL schema, immutable ledger trigger, & atomic PL/pgSQL procedures
│   ├── src/
│   │   ├── config/         # Environment validation (env.js)
│   │   ├── plugins/        # PostgreSQL pool (database.js) & Socket.IO server (socket.js)
│   │   ├── modules/        # auth, accounts, market (orderbook, matching-engine), trading, portfolio, events
│   │   └── routes/         # market.routes.js, orders.routes.js, portfolio.routes.js
│   └── tests/              # Vitest suites: matching-engine.test.js, trading.test.js, concurrency.test.js
├── isolated_features/      # Isolated feature modules (cleanly decoupled)
│   ├── gambling/           # Full Casino engines (Slot, Mahjong, Zeus, Wheel, Lottery, Parlay)
│   ├── business/           # Enterprise, 12 Sectors, 12 Ops Panels, Board, M&A, IPO Dashboard
│   └── career/             # Office Workplace, Work Simulations, Assistant, Politics System
└── dist/                   # Compiled production bundle (via npm run build)
```

---

## 🔖 Penanda Kelanjutan Project (Project Continuation Checkpoint)

Bagian ini menjadi penanda status terakhir pengerjaan agar sesi pengembangan berikutnya dapat langsung dilanjutkan dengan presisi:

### ✅ Yang Sudah Selesai Dikerjakan
1. **Arsitektur Backend `market-server/` (13/20 Item Rencana Implementasi):**
   - Fondasi server Fastify (`src/app.js`, `src/server.js`), konfigurasi Zod (`src/config/env.js`), koneksi PostgreSQL (`src/plugins/database.js`), dan autentikasi JWT Supabase (`src/modules/auth/`).
   - Skema database 8 tabel (`migrations/001_initial_schema.sql`), trigger imutabilitas `ledger_entries`, fungsi transaksi atomik PL/pgSQL (`migrations/002_atomic_trading_functions.sql`), dan seed saham awal (`migrations/003_seed_stocks.sql`).
   - *Continuous Limit Order Book* (`orderbook.js`) & *Matching Engine* (`matching-engine.js`) dengan prioritas Harga–Waktu, *Partial Fill*, *Market/Limit Order*, *Cancel*, *Price Improvement Refund*, dan *Idempotency Key*.
   - Integrasi Socket.IO (`src/plugins/socket.js`) & *Transactional Outbox Worker* (`outbox-worker.js`).
   - Penulisan skrip pengujian di `market-server/tests/` (`matching-engine.test.js`, `trading.test.js`, `concurrency.test.js`).
2. **Refactor Frontend & Onboarding Profil Risiko:**
   - Pembuatan `src/js/trading/MarketClient.js` dan integrasi mode *Authoritative Server* di `src/js/trading/StockMarket.js`.
   - Penggantian sistem pemilihan *Role* lama menjadi **Kuesioner Profil Risiko Investor** (`Investor Konservatif`, `Investor Pasif`, `Investor Agresif`) di `RoleManager.js` dan `main.js`, serta navigasi otomatis langsung ke **Dashboard Trading (`market`)**.

### ⏳ Tahap Selanjutnya (Belum Dijalankan / Menunggu Kelanjutan)
- [ ] **Langkah 1 — Instalasi Dependencies & Konfigurasi `.env`:**
  - Jalankan `npm install` di root project dan di dalam folder `market-server/`.
  - Salin `market-server/.env.example` ke `market-server/.env` dan isi kredensial Supabase (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
- [ ] **Langkah 2 — Eksekusi Migrasi Database Supabase:**
  - Jalankan `npm run migrate` di dalam `market-server/` untuk menerapkan `001_initial_schema.sql`, `002_atomic_trading_functions.sql`, dan `003_seed_stocks.sql` ke database Supabase.
- [ ] **Langkah 3 — Eksekusi Pengujian (Vitest & Live Test):**
  - Jalankan `npm test` di dalam `market-server/` untuk memverifikasi skenario prioritas harga–waktu, retry idempotensi, konkurensi banyak order bersamaan, dan pemulihan order saat server restart.
- [ ] **Langkah 4 — Integrasi UI Order Book & Playtest End-to-End:**
  - Menampilkan antrean *Bid/Ask* (`orderBooks`) dan riwayat transaksi *real-time* dari `MarketClient` ke komponen visual `TradingPage.js`, serta menambahkan *initial liquidity / NPC market maker* jika diperlukan saat pasar sepi.
- [ ] **Langkah 5 — Deployment Backend:**
  - Deploy `market-server/` ke Render atau Railway dan arahkan `VITE_MARKET_API_URL` di frontend ke URL produksi.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/Data%20Project/Personal%20Project/AuraAssets/LICENSE) file for details.

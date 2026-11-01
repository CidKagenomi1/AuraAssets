# AuraAssets 💼📈

An advanced, dark-themed **Idle Financial Portfolio & Enterprise Simulation Game** designed to simulate real-world financial systems, career ladders, investment markets, and corporate governance. Experience the journey from unemployment to becoming an industry tycoon.

> **Note:** AuraAssets is a client-side Single Page Application (SPA) utilizing a modern glassmorphism design system, now equipped with an **Authoritative Multiplayer Market Engine (`market-server/`)** powered by Fastify, Socket.IO, and Supabase PostgreSQL.

---

## 🎮 Gameplay Features

### 1. 📈 Financial & Investment Markets
- **Stock Market (Finite Supply & Macroeconomic Float):** Real-time stock price fluctuations across 100 stocks and 10 sectors, backed by the **AuraEconomyEngine** featuring finite shares outstanding, free float reserves, dynamic Market Capitalization tracking, and daily Previous Close rolling baselines.
- **Cryptocurrency Exchange (Dynamic Tokenomics & Scarcity):** Trade 102 digital assets categorized across 10 standardized bidang (L1, DeFi, AI & Big Data, Meme, Stablecoin, DePIN, etc.) with elastic Bonding Curve pricing, dynamic token minting from Launchpad/Launchpool & Staking emissions, multi-criteria filtering, and drilldown sub-categories.
- **Reksa Dana & Exchange-Traded Funds (ETF) Market:** Diversified managed portfolio and index fund market featuring 4 conventional mutual fund classes (Pasar Uang, Pendapatan Tetap, Campuran, Saham) and 6 Global ETFs (`SPY`, `QQQ`, `SMH`, `VNQ`, `EEM`, `XLV`) with daily Net Asset Value (NAV/NAB) drift, macroeconomic yield simulations, expense ratios, dividend yields, and passive compounding.
- **Dedicated Global Commodity Market (Brankas Fisik Digital):** Spot trading and digital custody vault across 4 distinct commodity sectors: Logam Mulia (Gold, Silver, Platinum), Energi (WTI Crude, Brent, Natural Gas), Logam Industri (Copper, Nickel, Lithium, Aluminum), and Agrikultur (CPO, Coffee, Wheat). Features 1:1 digital vault storage, fractional spot purchases, real-time Plotly candlestick charts, and instant cash liquidations.
- **Ultra-Safe Investment for Beginners & Settled Players:** Dedicated low-risk fund (*Manulife Dana Kas Mandiri* with ~5.2% p.a. guaranteed non-negative daily drift) engineered for beginner capital preservation and settled players securing profits away from high-volatility markets.
- **Interactive Investment Suite & Live Return Simulator:** Modern fund purchase menu equipped with real-time 1-month and 1-year profit projections, total 1-year capital growth forecasts, quick capital allocation buttons (Min, 25%, 50%, 75%, Maks), quick-boost pills (+$250, +$500, +$1K, +$5K), live unit calculation @ NAV, and 0% transaction fee guarantees.
- **Top Movers & AI Market Signals:** Live dashboard widget showcasing real-time Top Gainers and Top Losers with independent market category filters (**Semua**, **📈 Saham**, **🪙 Kripto**) and active AI Technical Signals (🚀 MOON, 🔥 HOT, ⚡ HEAT).
- **Comprehensive Market Table & Category Labeling:** Modern tabular market view featuring explicit, clickable sortable headers (**Aset**, **Nama**, **Sektor**, **Volatilitas**, **Harga**, **24h %**) with colored sector pills and risk badges (🛡️ Rendah, ⚖️ Moderat, 🚀 Tinggi) clearly visible even when unfiltered, plus mobile-optimized card sublines.
- **Investor Risk Profile Assessment:** Interactive onboarding questionnaire that evaluates player behavior and classifies them into **Investor Konservatif** (🛡️), **Investor Pasif** (⚖️), or **Investor Agresif** (🚀).
- **Financial Milestones with 75% Cash Rewards:** Tiered financial achievements rewarding 75% of the milestone target value as instant claimable cash.
- **Random Market Events & Breaking News (40 Macro & Sectoral Events):** Dynamic event engine containing 20 US Stock Market and 20 Cryptocurrency breaking news items that directly drive price movements, volatility shifts, and sectoral rallies or sell-offs over multi-day durations.

### 2. 🏢 Enterprise & Corporate Operations
- **Sectors:** Build and manage businesses in 8 distinct industries: Tech, Aerospace, Energy, Finance, Healthcare, Infrastructure, Retail, and Automotive.
- **Corporate Governance:** Purchase subsidiaries, hire staff, manage operational budgets, and adjust executive salaries.
- **Going Public (IPO):** Scale your enterprise, meet listing criteria, and launch an Initial Public Offering (IPO) to trade on the public stock exchange.
- **AI Competitors:** Navigate a dynamic market with rival corporations competing for market share.

### 3. 🏦 Banking System & Wealth Management
- **Digital Custody Vault:** 1:1 asset backing for physical commodity reserves with zero holding fees and automated net worth consolidation.
- **Banking System:** Secure capital through bank loans or park your excess cash in high-yield time deposits.
- **P2P Transfer & Kotak Donasi Komunitas:** Transfer dana instan antar pemain secara peer-to-peer (dengan biaya admin jaringan $ 1 per setiap $ 100 transfer) dan bagikan modal melalui Kotak Donasi Komunitas yang terhubung realtime via Supabase.
- **Bukti Transfer Resmi & Unduh PNG (Minimalis Polos):** Setiap pengiriman transfer dana otomatis memunculkan modal Bukti Transfer Resmi berdesain struk perbankan digital putih polos minimalis yang realistis (lengkap dengan No. Referensi unik, waktu transaksi nyata, tanggal game, akun pengirim & penerima, nominal terdebit, rincian biaya admin $1/$100, status transaksi berhasil, dan catatan transfer). Pemain dapat mengunduh resi transfer dalam format gambar PNG beresolusi tinggi (2x Retina Canvas 1080x1480 px), serta membuka kembali bukti transfer kapan saja dari notifikasi cek transfer.
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
- **Visualizations & Charts:** Plotly.js, Chart.js & ECharts (interactive financial Candlestick & Line charts with volume overlays, plus macroeconomic analytics)
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
│       ├── trading/        # StockMarket, MarketClient, CryptoMarket, CommodityManager, MutualFundManager, PassiveIncome, ChartEngine, CandleGenerator, TradingPage
│       │   └── panels/     # OrderPanel, TradeHistoryPanel, AssetSearchModal, StockPanel, CryptoPanel, CommodityPanel, TradingSignalPanel
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
│   ├── property/           # Archived Real Estate & Property Management engine
│   ├── marketplace/        # Archived Luxury Goods & Watch Marketplace
│   ├── gambling/           # Full Casino engines (Slot, Mahjong, Zeus, Wheel, Lottery, Parlay)
│   ├── business/           # Enterprise, 12 Sectors, 12 Ops Panels, Board, M&A, IPO Dashboard
│   └── career/             # Office Workplace, Work Simulations, Assistant, Politics System
└── dist/                   # Compiled production bundle (via npm run build)
```

---

## 🚀 Riwayat Pembaruan & Changelog

Seluruh riwayat pembaruan fitur, log perubahan versi, keputusan rekayasa finansial, penanda kelanjutan proyek, dan arsitektur sistem telah dipindahkan dan dirangkum secara lengkap di file terpisah:

👉 **[Lihat Riwayat Pembaruan Lengkap di update.md](update.md)**

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/Data%20Project/Personal%20Project/AuraAssets/LICENSE) file for details.

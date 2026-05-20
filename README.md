# AuraAssets 💼📈

An advanced, dark-themed **Idle Financial Portfolio & Enterprise Simulation Game** designed to simulate real-world financial systems, career ladders, investment markets, and corporate governance. Experience the journey from unemployment to becoming an industry tycoon.

> **Note:** AuraAssets is a client-side Single Page Application (SPA) utilizing a modern glassmorphism design system. It is fully responsive and run entirely in the browser.

---

## 🎮 Gameplay Features

### 1. 📈 Financial & Investment Markets
- **Stock Market:** Real-time stock price fluctuations driven by news cycles and economic events. Buy/sell shares and set pending orders.
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

AuraAssets is built using modern frontend web technologies:

- **Markup:** Semantic HTML5
- **Styling:** Custom Vanilla CSS3 (features a premium Dark/Glassmorphic dashboard theme with micro-animations)
- **Logic:** Vanilla JavaScript (ES6+ Modular architecture)
- **Visualizations & Charts:** Chart.js (for drawing economic trends and trading asset histories)
- **Bundler & Server:** Vite 5.x

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone this repository or download the source files.
2. Open your terminal in the project directory:
   ```bash
   cd AuraAssets
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
Start the Vite development server:
```bash
npm run dev
```
Open the local server URL (usually `http://localhost:5173`) in your web browser.

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
├── index.html          # Application entry point and layout shell
├── package.json        # Node metadata and dependencies
├── vite.config.js      # Vite configuration file
├── src/
│   ├── styles/         # CSS style modules (main, components, trading, work, etc.)
│   └── js/
│       ├── main.js     # Orchestrator and entry script
│       ├── ai/         # AI Competitor logic
│       ├── finance/    # Core engines for Stocks, Crypto, Bank, and Taxes
│       ├── game/       # Game state, time progression, and news manager
│       ├── property/   # Real estate management
│       └── ui/         # UI View controller, layout managers, and panels (IPO, Loans, Stocks, etc.)
└── dist/               # Compiled production files (after npm run build)
```

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/Data%20Project/Personal%20Project/AuraAssets/LICENSE) file for details.

/**
 * PassiveIncomeView.js - Dedicated View & Sub-Views for Staking, Mining, Trading Bots, and Launchdrops
 * Standalone page with Hero KPIs and modular sub-tab navigation
 */

import passiveIncomeManager from '../../trading/PassiveIncomeManager.js';
import gameState from '../../core/GameState.js';
import stockMarket from '../../trading/StockMarket.js';
import cryptoMarket from '../../trading/CryptoMarket.js';
import ui from '../UIManager.js';

let currentPassiveSubTab = 'staking';

export function getActivePassiveSubTab() {
  return currentPassiveSubTab;
}

export function setActivePassiveSubTab(tab) {
  currentPassiveSubTab = tab;
}

/**
 * Render the dedicated Passive Income standalone page
 */
export function renderPassiveIncomePage(container = null) {
  const target = container || document.getElementById('passive-page-container') || document.getElementById('view-passive');
  if (!target) return;

  const piState = passiveIncomeManager.getState();
  const btc = cryptoMarket.getCrypto('BTC');
  const btcPrice = btc ? btc.price : 60000;

  // 1. Calculate Hero KPIs
  // A. Staking Metrics
  let totalStakedUSD = 0;
  let totalPendingRewardsUSD = 0;
  let stakedAssetsCount = 0;
  const wallet = gameState.get('crypto') || {};

  // Calculate across all staked assets dynamically
  const allStakedSymbols = new Set([
    ...Object.keys(piState.staked || {}),
    ...Object.keys(piState.stakingRewards || {})
  ]);

  allStakedSymbols.forEach(symbol => {
    const stakedAmt = piState.staked[symbol] || 0;
    const pendingReward = piState.stakingRewards?.[symbol] || 0;
    const cData = cryptoMarket.getCrypto(symbol);
    const price = cData ? cData.price : 1;

    if (stakedAmt > 0) {
      stakedAssetsCount++;
      totalStakedUSD += stakedAmt * price;
    }
    if (pendingReward > 0) {
      totalPendingRewardsUSD += pendingReward * price;
    }
  });

  // B. AI Bot Metrics
  const activeBots = piState.bots || [];
  let totalBotCapital = 0;
  let totalBotProfit = 0;
  activeBots.forEach(b => {
    totalBotCapital += b.capital || 0;
    totalBotProfit += b.profit || 0;
  });
  const botRoiPct = totalBotCapital > 0 ? (totalBotProfit / totalBotCapital) * 100 : 0;

  // D. Launchdrop Metrics
  const launchdrops = piState.launchdrops || [];
  let totalCommittedLaunchdrop = 0;
  let claimableLaunchdropsCount = 0;
  launchdrops.forEach(ld => {
    if (ld.committed > 0 && !ld.claimed) {
      totalCommittedLaunchdrop += ld.committed;
    }
    if (ld.status === 'CLAIMABLE') {
      claimableLaunchdropsCount++;
    }
  });

  // Preserve focus if user is typing in search or input fields
  const activeEl = document.activeElement;
  const isUserTyping = activeEl && target.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');

  // Sub-view HTML generator
  let subViewContent = '';
  if (currentPassiveSubTab === 'staking') {
    subViewContent = renderStakingMiningView_OnlyStaking();
  } else if (currentPassiveSubTab === 'bot') {
    subViewContent = renderBotTradingView();
  } else if (currentPassiveSubTab === 'launchdrop') {
    subViewContent = renderLaunchdropView();
  } else {
    currentPassiveSubTab = 'staking';
    subViewContent = renderStakingMiningView_OnlyStaking();
  }

  // Only rewrite innerHTML if not actively typing inside input fields, or update dynamically
  if (isUserTyping) {
    const subContainer = document.getElementById('passive-subview-content');
    if (subContainer) {
      // Don't disturb active search inputs
      return;
    }
  }

  target.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem; animation: fade-up 0.25s ease;">
      <!-- Page Header -->
      <div class="passive-header-banner" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              ⚡
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0; letter-spacing: -0.02em;">Pendapatan Pasif & Launchpad</h2>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            Kelola portofolio aset produktif: Smart Contract Staking, AI Trading Bot, dan Launchdrop (Launchpool & Launchpad).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); font-size: 0.8rem; color: #10b981; font-weight: 700;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            Auto-Yield Aktif
          </span>
        </div>
      </div>

      <!-- Hero KPI Metrics Grid (3 Pillars) -->
      <div class="passive-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
        <!-- Staking KPI -->
        <div class="card passive-kpi-card" style="background: rgba(24, 24, 27, 0.65); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 1rem; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🔒 Staking Vault</span>
            <span style="font-size: 0.7rem; color: var(--accent-primary); background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px;">${stakedAssetsCount} Aset</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: white;">$ ${totalStakedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style="font-size: 0.75rem; color: #10b981; margin-top: 0.25rem; font-weight: 600;">
            Pending: +$ ${totalPendingRewardsUSD.toFixed(2)}
          </div>
        </div>

        <!-- Trading Bot KPI -->
        <div class="card passive-kpi-card" style="background: rgba(24, 24, 27, 0.65); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 1rem; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🤖 AI Trading Bot</span>
            <span style="font-size: 0.7rem; color: #3b82f6; background: rgba(59,130,246,0.1); padding: 2px 6px; border-radius: 4px;">${activeBots.length} Berjalan</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: ${totalBotProfit >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'};">
            ${totalBotProfit >= 0 ? '+' : ''}$ ${Math.round(totalBotProfit).toLocaleString()}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
            Modal: $ ${Math.round(totalBotCapital).toLocaleString()} (${botRoiPct >= 0 ? '+' : ''}${botRoiPct.toFixed(1)}%)
          </div>
        </div>

        <!-- Launchdrop KPI -->
        <div class="card passive-kpi-card" style="background: rgba(24, 24, 27, 0.65); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 1rem; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🚀 Launchdrop Kripto</span>
            <span style="font-size: 0.7rem; color: #8b5cf6; background: rgba(139,92,246,0.1); padding: 2px 6px; border-radius: 4px;">${launchdrops.length} Event</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: white;">$ ${totalCommittedLaunchdrop.toLocaleString()}</div>
          <div style="font-size: 0.75rem; color: ${claimableLaunchdropsCount > 0 ? '#10b981' : 'var(--text-muted)'}; margin-top: 0.25rem; font-weight: ${claimableLaunchdropsCount > 0 ? '700' : 'normal'};">
            ${claimableLaunchdropsCount > 0 ? `🎁 ${claimableLaunchdropsCount} Token Siap Diklaim!` : 'Menunggu distribusi token'}
          </div>
        </div>
      </div>

      <!-- Horizontal Tab Strip Navigation -->
      <div class="passive-subtab-strip" style="background: rgba(18, 18, 20, 0.85); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 4px; display: flex; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;" id="passive-subtab-group">
        <button class="btn btn-sm passive-subtab-btn ${currentPassiveSubTab === 'staking' ? 'active' : ''}" data-subtab="staking" style="flex: 1; min-width: 130px; height: 38px; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 6px; transition: all 0.2s ease; border: none; ${currentPassiveSubTab === 'staking' ? 'background: linear-gradient(135deg, var(--accent-primary) 0%, #059669 100%); color: #000; box-shadow: 0 2px 8px rgba(16,185,129,0.3);' : 'background: transparent; color: var(--text-muted);'}">
          <span>🔒</span> Vault Staking
          ${stakedAssetsCount > 0 ? `<span style="font-size: 0.65rem; background: ${currentPassiveSubTab === 'staking' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)'}; padding: 1px 5px; border-radius: 99px;">${stakedAssetsCount}</span>` : ''}
        </button>

        <button class="btn btn-sm passive-subtab-btn ${currentPassiveSubTab === 'bot' ? 'active' : ''}" data-subtab="bot" style="flex: 1; min-width: 140px; height: 38px; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 6px; transition: all 0.2s ease; border: none; ${currentPassiveSubTab === 'bot' ? 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; box-shadow: 0 2px 8px rgba(59,130,246,0.3);' : 'background: transparent; color: var(--text-muted);'}">
          <span>🤖</span> AI Trading Bot
          ${activeBots.length > 0 ? `<span style="font-size: 0.65rem; background: ${currentPassiveSubTab === 'bot' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}; padding: 1px 5px; border-radius: 99px;">${activeBots.length}</span>` : ''}
        </button>

        <button class="btn btn-sm passive-subtab-btn ${currentPassiveSubTab === 'launchdrop' ? 'active' : ''}" data-subtab="launchdrop" style="flex: 1; min-width: 140px; height: 38px; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 6px; transition: all 0.2s ease; border: none; ${currentPassiveSubTab === 'launchdrop' ? 'background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff; box-shadow: 0 2px 8px rgba(139,92,246,0.3);' : 'background: transparent; color: var(--text-muted);'}">
          <span>🚀</span> Launchdrop Kripto
          ${claimableLaunchdropsCount > 0 ? `<span style="font-size: 0.65rem; background: #10b981; color: #000; font-weight: 800; padding: 1px 5px; border-radius: 99px;">🎁 ${claimableLaunchdropsCount}</span>` : ''}
        </button>
      </div>

      <!-- Sub-View Content Container -->
      <div id="passive-subview-content" style="background: rgba(0,0,0,0.18); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
        ${subViewContent}
      </div>
    </div>
  `;

  // Bind sub-tab buttons
  const subTabBtns = target.querySelectorAll('.passive-subtab-btn');
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTab = btn.dataset.subtab;
      if (selectedTab && selectedTab !== currentPassiveSubTab) {
        currentPassiveSubTab = selectedTab;
        renderPassiveIncomePage(container);
      }
    });
  });

  // Re-bind input helpers like numeric inputs
  bindPassiveIncomeButtons();
}

/**
 * Backwards-compatibility wrapper for any legacy calls
 */
export function renderPassiveIncomeView(activeView = 'staking') {
  currentPassiveSubTab = activeView;
  let subViewHTML = '';

  if (activeView === 'staking') {
    subViewHTML = renderStakingMiningView_OnlyStaking();
  } else if (activeView === 'mining') {
    subViewHTML = renderStakingMiningView_OnlyMining();
  } else if (activeView === 'bot') {
    subViewHTML = renderBotTradingView();
  } else if (activeView === 'launchdrop') {
    subViewHTML = renderLaunchdropView();
  }

  return `
    <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1rem; animation: fade-up 0.3s ease;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white;">⚡ Investasi Pasif & Launch</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Kelola berbagai instrumen investasi pasif Anda di bawah ini.</p>
        </div>
        <div>
          <select id="passive-income-type-select" class="form-input" style="background: var(--bg-surface); color: white; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-weight: 700; width: 220px;" onchange="window.changePassiveView(this.value)">
            <option value="staking" ${activeView === 'staking' ? 'selected' : ''}>🔒 Vault Staking Kripto</option>
            <option value="bot" ${activeView === 'bot' ? 'selected' : ''}>🤖 Trading Bot Otomatis</option>
            <option value="launchdrop" ${activeView === 'launchdrop' ? 'selected' : ''}>🚀 Launchdrop Kripto</option>
          </select>
        </div>
      </div>
      <div>
        ${subViewHTML}
      </div>
    </div>
  `;
}

export function renderStakingMiningView_OnlyStaking() {
    const piState = passiveIncomeManager.getState();
    const wallet = gameState.get('crypto') || {};
    const allPools = passiveIncomeManager.getAllStakingPools();

    // Active filter and search state
    const stakingFilter = window._stakingFilterTab || 'all';
    const stakingSearch = (window._stakingSearchQuery || '').toLowerCase().trim();

    let poolEntries = Object.entries(allPools);

    // Apply Filter Tab
    if (stakingFilter === 'wallet') {
      poolEntries = poolEntries.filter(([sym]) => (wallet[sym]?.amount > 0) || (piState.staked[sym] > 0));
    } else if (stakingFilter === 'l1') {
      poolEntries = poolEntries.filter(([, spec]) => spec.sector === 'Layer 1 (L1)');
    } else if (stakingFilter === 'defi') {
      poolEntries = poolEntries.filter(([, spec]) => spec.sector === 'DeFi & Staking');
    } else if (stakingFilter === 'high_apy') {
      poolEntries = poolEntries.filter(([, spec]) => spec.apy >= 0.08);
    }

    // Apply Search
    if (stakingSearch) {
      poolEntries = poolEntries.filter(([sym, spec]) => {
        return sym.toLowerCase().includes(stakingSearch) || 
               spec.name.toLowerCase().includes(stakingSearch) ||
               (spec.sector && spec.sector.toLowerCase().includes(stakingSearch));
      });
    }

    // Sort: Staked items first, then by APY descending
    poolEntries.sort(([symA, specA], [symB, specB]) => {
      const stakedA = piState.staked[symA] > 0 ? 1 : 0;
      const stakedB = piState.staked[symB] > 0 ? 1 : 0;
      if (stakedA !== stakedB) return stakedB - stakedA;
      return (specB.apy || 0) - (specA.apy || 0);
    });

    const stakingCardsHTML = poolEntries.length === 0 
      ? `<div style="text-align: center; color: var(--text-muted); padding: 3rem 1.5rem; background: rgba(0,0,0,0.15); border: 1.5px dashed var(--border-color); border-radius: var(--radius-md);">
           <span style="font-size: 2rem; display:block; margin-bottom: 0.5rem;">🔒</span>
           <div style="font-weight: 700; color: white;">Tidak Ada Staking Pool Ditemukan</div>
           <div style="font-size: 0.8rem; margin-top: 0.25rem;">Coba sesuaikan kata kunci pencarian atau ganti filter kategori.</div>
         </div>`
      : poolEntries.map(([symbol, spec]) => {
          const holding = wallet[symbol];
          const walletAmt = holding ? holding.amount : 0;
          const stakedAmt = piState.staked[symbol] || 0;
          const isStaked = stakedAmt > 0;
          const lockType = piState.stakedLocks?.[symbol] || 'flexible';
          const isLocked = lockType === 'locked';
          const pendingReward = piState.stakingRewards?.[symbol] || 0;
          const crypto = cryptoMarket.getCrypto(symbol);
          const coinIcon = crypto ? crypto.icon : '🪙';
          const currentPrice = crypto ? crypto.price : 1.0;
          
          const baseApyPct = (spec.apy * 100).toFixed(1);
          const lockedApyPct = (spec.apy * 1.35 * 100).toFixed(1);
          const effectiveApyPct = isLocked ? lockedApyPct : baseApyPct;

          const stakedValueUSD = stakedAmt * currentPrice;
          const rewardValueUSD = pendingReward * currentPrice;

          return `
            <div class="card staking-card" style="background: ${isStaked ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(20,20,24,0.6) 100%)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isStaked ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 1.15rem; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: ${isStaked ? '0 4px 15px rgba(16,185,129,0.1)' : 'none'};">
              <!-- Top Row: Icon, Name, Sector, APY Badge -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <span style="font-size: 1.8rem; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 8px;">${coinIcon}</span>
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                      <span style="font-weight: 800; color: white; font-size: 1.05rem;">${spec.name}</span>
                      <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${symbol}</span>
                      ${isStaked ? `<span style="font-size: 0.65rem; background: rgba(16,185,129,0.18); color: #10b981; border: 1px solid rgba(16,185,129,0.35); padding: 1px 6px; border-radius: 99px; font-weight: 800;">AKTIF STAKED</span>` : ''}
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.1rem;">
                      ${spec.sector || 'Kripto'} • $${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                  </div>
                </div>

                <div style="text-align: right; display: flex; align-items: center; gap: 0.6rem;">
                  <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); padding: 4px 10px; text-align: right;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Est. APY</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-primary); line-height: 1.1;">${effectiveApyPct}%</div>
                    <div style="font-size: 0.6rem; color: var(--text-dim);">Locked: ${lockedApyPct}%</div>
                  </div>
                </div>
              </div>

              <!-- Middle: Wallet Balance & Staked Info Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; background: rgba(0,0,0,0.22); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); font-size: 0.78rem;">
                <div>
                  <div style="color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase;">Saldo di Wallet</div>
                  <div style="font-weight: 700; color: white;">${cryptoMarket.formatAmount(walletAmt)} ${symbol}</div>
                  <div style="font-size: 0.68rem; color: var(--text-dim);">$${(walletAmt * currentPrice).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                </div>
                <div>
                  <div style="color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase;">Jumlah Staked</div>
                  <div style="font-weight: 800; color: ${isStaked ? 'var(--accent-primary)' : 'var(--text-muted)'};">${cryptoMarket.formatAmount(stakedAmt)} ${symbol}</div>
                  <div style="font-size: 0.68rem; color: var(--text-dim);">${isStaked ? `$${stakedValueUSD.toLocaleString(undefined, { maximumFractionDigits: 1 })} (${lockType === 'locked' ? 'Locked 30H' : 'Fleksibel'})` : '-'}</div>
                </div>
                <div>
                  <div style="color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase;">Pending Reward</div>
                  <div style="font-weight: 800; color: #10b981;">+${cryptoMarket.formatAmount(pendingReward)} ${symbol}</div>
                  <div style="font-size: 0.68rem; color: #10b981;">+$${rewardValueUSD.toFixed(3)}</div>
                </div>
              </div>

              <!-- Bottom Actions Bar -->
              <div class="staking-card-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                <button onclick="window.openStakingModal('${symbol}')" class="btn btn-primary btn-sm staking-btn" style="flex: 1; min-height: 38px; font-size: 0.78rem; font-weight: 800; justify-content: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                  <span>🔒</span> Stake ${symbol}
                </button>
                ${isStaked ? `
                  <button onclick="unstakeCryptoPrompt('${symbol}')" class="btn btn-secondary btn-sm staking-btn" style="flex: 1; min-height: 38px; font-size: 0.78rem; font-weight: 800; justify-content: center; color: var(--accent-danger); border-color: rgba(239,68,68,0.25);">
                    Unstake
                  </button>
                ` : ''}
                ${pendingReward > 0 ? `
                  <button onclick="claimStakingReward('${symbol}')" class="btn btn-primary btn-sm staking-btn" style="flex: 1; min-height: 38px; font-size: 0.78rem; font-weight: 800; justify-content: center; background: #10b981; border-color: #10b981;">
                    🎁 Klaim Reward
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');

    let totalPendingRewards = 0;
    if (piState.stakingRewards) {
      Object.values(piState.stakingRewards).forEach(r => totalPendingRewards += r);
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 1rem; animation: fade-up 0.25s ease;">
        <!-- Header Banner with Claim All Action -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.85rem;">
          <div>
            <h4 style="font-size:1.15rem; font-weight:800; color:white; display:flex; align-items:center; gap:0.4rem; margin:0 0 0.2rem 0;">
              🔒 Smart Contract Staking Vault
            </h4>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">
              Kunci aset kripto PoS & DeFi Anda untuk menghasilkan yield pasif harian. Pilihan Fleksibel atau Locked 30 Hari dengan bonus yield +35%.
            </p>
          </div>
          ${totalPendingRewards > 0 ? `
            <button onclick="claimAllStakingRewards()" class="btn btn-primary btn-sm" style="font-size:0.8rem; font-weight:800; background: #10b981; border-color:#10b981; min-height: 38px; padding: 0 16px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
              🎁 Klaim Semua Yield
            </button>
          ` : ''}
        </div>

        <!-- Filter & Search Controls Bar -->
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center; background: rgba(0,0,0,0.22); padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.06);">
          <div style="flex: 1; min-width: 190px; position: relative;">
            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); opacity: 0.5; font-size: 0.8rem;">🔍</span>
            <input type="text" id="staking-search-input" placeholder="Cari token, simbol, atau sektor..." value="${window._stakingSearchQuery || ''}" 
              style="width: 100%; padding: 0.45rem 0.5rem 0.45rem 2.1rem; background: var(--bg-surface); color: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem;" 
              oninput="window.setStakingSearch(this.value)">
          </div>

          <div style="display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
            <button class="btn btn-sm" onclick="window.setStakingFilterTab('all')" style="font-size: 0.72rem; padding: 5px 9px; border: none; font-weight: 700; background: ${stakingFilter === 'all' ? 'var(--accent-primary-soft)' : 'transparent'}; color: ${stakingFilter === 'all' ? 'var(--accent-primary)' : 'var(--text-muted)'}; white-space:nowrap;">Semua Pool</button>
            <button class="btn btn-sm" onclick="window.setStakingFilterTab('wallet')" style="font-size: 0.72rem; padding: 5px 9px; border: none; font-weight: 700; background: ${stakingFilter === 'wallet' ? 'rgba(16,185,129,0.2)' : 'transparent'}; color: ${stakingFilter === 'wallet' ? '#10b981' : 'var(--text-muted)'}; white-space:nowrap;">💼 Di Wallet Saya</button>
            <button class="btn btn-sm" onclick="window.setStakingFilterTab('l1')" style="font-size: 0.72rem; padding: 5px 9px; border: none; font-weight: 700; background: ${stakingFilter === 'l1' ? 'rgba(59,130,246,0.2)' : 'transparent'}; color: ${stakingFilter === 'l1' ? '#3b82f6' : 'var(--text-muted)'}; white-space:nowrap;">Layer 1 PoS</button>
            <button class="btn btn-sm" onclick="window.setStakingFilterTab('defi')" style="font-size: 0.72rem; padding: 5px 9px; border: none; font-weight: 700; background: ${stakingFilter === 'defi' ? 'rgba(139,92,246,0.2)' : 'transparent'}; color: ${stakingFilter === 'defi' ? '#a855f7' : 'var(--text-muted)'}; white-space:nowrap;">DeFi & Yield</button>
            <button class="btn btn-sm" onclick="window.setStakingFilterTab('high_apy')" style="font-size: 0.72rem; padding: 5px 9px; border: none; font-weight: 700; background: ${stakingFilter === 'high_apy' ? 'rgba(245,158,11,0.2)' : 'transparent'}; color: ${stakingFilter === 'high_apy' ? '#f59e0b' : 'var(--text-muted)'}; white-space:nowrap;">🔥 Top APY (>8%)</button>
          </div>
        </div>

        <!-- Cards List Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.85rem;">
          ${stakingCardsHTML}
        </div>
      </div>
    `;
}

export function renderLaunchdropView() {
    const piState = passiveIncomeManager.getState();
    const drops = piState.launchdrops || [];

    const now = new Date();
    const currentUtcSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    const targetUtcSeconds = 12 * 3600; // 12:00 UTC
    let secondsToNext = targetUtcSeconds - currentUtcSeconds;
    if (secondsToNext <= 0) {
      secondsToNext += 24 * 3600;
    }

    const formatTimer = (sec) => {
      if (!sec || sec <= 0) return '00:00:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const renderCard = (ld) => {
      const isPool = ld.type === 'launchpool';
      const crypto = cryptoMarket.getCrypto(ld.symbol);
      const currentPrice = crypto ? crypto.price : 1.0;

      const isUpcoming = ld.status === 'UPCOMING';
      const isActive = ld.status === 'ACTIVE';
      const isClaimable = ld.status === 'CLAIMABLE';
      const isEnded = ld.status === 'ENDED';

      let statusBadgeBg = 'rgba(245, 158, 11, 0.12)';
      let statusTextColor = '#f59e0b';
      let statusText = 'UPCOMING ⏳';

      if (isActive) {
        statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
        statusTextColor = '#10b981';
        statusText = 'OPEN / ACTIVE 🟢';
      } else if (isClaimable) {
        statusBadgeBg = 'rgba(16, 185, 129, 0.25)';
        statusTextColor = '#10b981';
        statusText = 'CLAIMABLE 🎁';
      } else if (isEnded) {
        statusBadgeBg = 'rgba(255, 255, 255, 0.06)';
        statusTextColor = 'var(--text-muted)';
        statusText = 'ENDED 🏁';
      }

      // Calculations
      let yieldDetailsHTML = '';
      if (isPool) {
        const yieldRate = ld.yieldRate || 0.12;
        const rewardTokens = currentPrice > 0 ? (ld.committed * yieldRate) / currentPrice : 0;
        const rewardUsd = ld.committed * yieldRate;

        yieldDetailsHTML = `
          <div class="launchdrop-stats-grid" style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.22); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(16,185,129,0.15);">
            <div>Committed Kas: <span style="color: white; font-weight:700;">$ ${ld.committed.toLocaleString()}</span></div>
            <div>Jaminan Modal: <span style="color: #10b981; font-weight:700;">100% Balik Utuh</span></div>
            <div>Airdrop Reward: <span style="color: #10b981; font-weight:800;">+${rewardTokens.toFixed(4)} ${ld.symbol}</span></div>
            <div>Estimasi Cuan: <span style="color: #38bdf8; font-weight:700;">+$ ${Math.round(rewardUsd).toLocaleString()}</span></div>
            <div style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.06); padding-top:0.35rem; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 0.73rem;">${isUpcoming ? 'Buka dalam:' : isActive ? 'Sisa Waktu Pool:' : 'Durasi 3 Jam:'}</span>
              <span style="color: ${isActive ? '#10b981' : isUpcoming ? '#f59e0b' : 'white'}; font-weight:800; font-family:monospace; font-size: 0.85rem;">
                ${isEnded ? 'Selesai' : formatTimer(ld.timeRemaining)}
              </span>
            </div>
          </div>
        `;
      } else {
        const discountRate = ld.discountRate || 0.50;
        const presalePrice = currentPrice * (1 - discountRate);
        const allocatedTokens = presalePrice > 0 ? ld.committed / presalePrice : 0;
        const marketValue = allocatedTokens * currentPrice;

        yieldDetailsHTML = `
          <div class="launchdrop-stats-grid" style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.22); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(139,92,246,0.18);">
            <div>Harga Presale: <span style="color: #a855f7; font-weight:800;">$ ${presalePrice.toFixed(4)}</span> <span style="font-size:0.68rem; color:#10b981;">(-50%)</span></div>
            <div>Harga Pasar: <span style="color: white; font-weight:600;">$ ${currentPrice.toFixed(4)}</span></div>
            <div>Committed Anda: <span style="color: white; font-weight:700;">$ ${ld.committed.toLocaleString()}</span></div>
            <div>Alokasi Token: <span style="color: #a855f7; font-weight:800;">+${allocatedTokens.toFixed(2)} ${ld.symbol}</span></div>
            <div>Nilai Pasar Listing: <span style="color: #10b981; font-weight:800;">$ ${Math.round(marketValue).toLocaleString()} (+100%)</span></div>
            <div>Status Trade: <span style="color: #eab308; font-weight:600;">Tradeable stlh 5 jam</span></div>
            <div style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.06); padding-top:0.35rem; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 0.73rem;">${isUpcoming ? 'Presale buka dalam:' : isActive ? 'Listing pasar dalam:' : 'Durasi 5 Jam:'}</span>
              <span style="color: ${isActive ? '#a855f7' : isUpcoming ? '#f59e0b' : 'white'}; font-weight:800; font-family:monospace; font-size: 0.85rem;">
                ${isEnded ? 'Selesai & Listing' : formatTimer(ld.timeRemaining)}
              </span>
            </div>
          </div>
        `;
      }

      const cardBorder = isPool ? 'rgba(16, 185, 129, 0.28)' : 'rgba(139, 92, 246, 0.28)';
      const cardGlow = isPool ? 'rgba(16, 185, 129, 0.04)' : 'rgba(139, 92, 246, 0.04)';
      const typeTag = isPool 
        ? `<span style="font-size: 0.65rem; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 2px 7px; border-radius: 99px; font-weight: 800; text-transform: uppercase;">🚀 Launchpool • Modal Balik 100%</span>`
        : `<span style="font-size: 0.65rem; background: rgba(139,92,246,0.15); color: #a855f7; border: 1px solid rgba(139,92,246,0.3); padding: 2px 7px; border-radius: 99px; font-weight: 800; text-transform: uppercase;">💎 Launchpad • Diskon 50%</span>`;

      return `
        <div class="card launchdrop-card" style="background: linear-gradient(180deg, ${cardGlow} 0%, rgba(20,20,24,0.7) 100%); border: 1.5px solid ${cardBorder}; border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <div>
            <div class="launchdrop-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem;">
              <div>
                <div style="margin-bottom: 0.35rem;">${typeTag}</div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span style="font-size: 1.4rem;">${ld.icon || '🪙'}</span>
                  <div>
                    <span style="font-weight: 800; color: white; font-size: 1.1rem;">${ld.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; margin-left: 0.2rem;">${ld.symbol}</span>
                  </div>
                </div>
                <div style="font-size: 0.72rem; color: var(--accent-primary); margin-top: 0.2rem; font-weight: 600;">Sektor: ${ld.sector || 'Kripto'}</div>
              </div>
              <span style="font-size: 0.72rem; background: ${statusBadgeBg}; color: ${statusTextColor}; padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 800; white-space: nowrap;">
                ${statusText}
              </span>
            </div>
            
            <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 0.85rem; background: rgba(255,255,255,0.02); padding: 0.5rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.04);">
              ${ld.desc}
            </p>
            
            ${yieldDetailsHTML}
          </div>

          <!-- Actions -->
          <div class="launchdrop-card-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${isActive ? `
              <button onclick="commitLaunchdropPrompt('${ld.id}')" class="btn btn-primary btn-sm launchdrop-btn" style="width: 100%; font-size: 0.82rem; font-weight:800; height:38px; justify-content:center; ${isPool ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);' : 'background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);'} box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                ${isPool ? '🚀 Stake Kas (Modal Aman 100%)' : '💎 Beli Presale Diskon 50%'}
              </button>
            ` : ''}

            ${isClaimable ? `
              <button onclick="claimLaunchdropReward('${ld.id}')" class="btn btn-primary btn-sm launchdrop-btn" style="width: 100%; font-size: 0.82rem; font-weight:800; height:38px; justify-content:center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-color:#10b981; box-shadow: 0 0 15px rgba(16,185,129,0.4); animation: pulse 2s infinite;">
                ${isPool ? '🎁 Klaim Modal Pokok + Airdrop Gratis' : '🚀 Klaim Token Presale & Siap Trade'}
              </button>
            ` : ''}

            ${isUpcoming ? `
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-secondary btn-sm launchdrop-btn" style="flex: 1; font-size: 0.75rem; font-weight:700; height:34px; justify-content:center; color: var(--text-muted);" disabled>
                  ⏳ Buka Jam 12:00 UTC
                </button>
                <button onclick="simulateFastForwardLaunchdrop('${ld.id}')" class="btn btn-outline-warning btn-sm launchdrop-btn" title="Mode Uji Coba: Buka pool sekarang" style="font-size: 0.72rem; font-weight: 700; height:34px; padding: 0 8px;">
                  ⚡ Tes Buka
                </button>
              </div>
            ` : ''}

            ${isEnded ? `
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-secondary btn-sm launchdrop-btn" style="flex: 1; font-size: 0.75rem; font-weight:700; height:34px; justify-content:center;" disabled>
                  🏁 Event Selesai
                </button>
                ${!isPool ? `
                  <button onclick="openCryptoTrade('${ld.symbol}')" class="btn btn-sm btn-primary launchdrop-btn" style="font-size: 0.72rem; font-weight: 800; height: 34px; background: #3b82f6; border-color: #3b82f6; padding: 0 12px;">
                    📈 Trade
                  </button>
                ` : ''}
              </div>
            ` : ''}

            ${isActive ? `
              <button onclick="simulateFastForwardLaunchdrop('${ld.id}')" style="background: none; border: none; color: rgba(255,255,255,0.3); font-size: 0.68rem; text-decoration: underline; cursor: pointer; padding: 2px;">
                ⚡ Fast-Forward ke Status Klaim (Tes Mode)
              </button>
            ` : ''}
          </div>
        </div>
      `;
    };

    const poolsHTML = drops.filter(l => l.type === 'launchpool').map(renderCard).join('');
    const padsHTML = drops.filter(l => l.type === 'launchpad').map(renderCard).join('');

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem; animation: fade-up 0.3s ease;">
        <!-- Header Banner & Clock Status -->
        <div class="launchdrop-header-banner" style="background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(16,185,129,0.08) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h4 style="font-size:1.15rem; font-weight:800; color:white; display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.25rem;">
                🚀 Ekosistem Launchdrop Kripto (Non-Top 10)
              </h4>
              <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">
                Buka serentak setiap hari pukul <strong style="color: white;">12:00 UTC</strong>. Rotasi token berganti tiap hari!
              </p>
            </div>
            <div class="launchdrop-countdown-box" style="text-align: right; background: rgba(0,0,0,0.35); padding: 5px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08);">
              <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Countdown Next Launchdrop</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #38bdf8; font-family: monospace;">⏳ ${formatTimer(secondsToNext)}</div>
            </div>
          </div>
        </div>

        <!-- 2 Grid Columns: Launchpool vs Launchpad -->
        <div class="launchdrop-columns" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
          <!-- Launchpool Column -->
          <div class="launchdrop-column">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h5 style="font-size: 0.92rem; font-weight: 800; color: white; display:flex; align-items:center; gap: 0.35rem; margin:0;">
                <span>🚀</span> Launchpool (Staking Kas Aman)
              </h5>
              <span style="font-size: 0.7rem; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 7px; border-radius: 99px; font-weight: 700;">Durasi 3 Jam</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${poolsHTML || '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 2rem;">Tidak ada pool aktif</div>'}
            </div>
          </div>

          <!-- Launchpad Column -->
          <div class="launchdrop-column">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h5 style="font-size: 0.92rem; font-weight: 800; color: white; display:flex; align-items:center; gap: 0.35rem; margin:0;">
                <span>💎</span> Launchpad (Presale Diskon 50%)
              </h5>
              <span style="font-size: 0.7rem; color: #a855f7; background: rgba(139,92,246,0.1); padding: 2px 7px; border-radius: 99px; font-weight: 700;">Durasi 5 Jam</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${padsHTML || '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 2rem;">Tidak ada presale aktif</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
}

export function renderBotTradingView() {
    const piState = passiveIncomeManager.getState();

    // Default deploy mode: 'market' | 'sector' | 'asset'
    const deployMode = window._botDeployMode || 'market';
    const selectedMarket = window._botSelectedMarket || 'crypto';
    const selectedSector = window._botSelectedSector || 'DeFi & Staking';
    const selectedAssetSym = window._botSelectedAsset || 'BTC';
    const selectedAssetType = window._botSelectedAssetType || 'crypto';

    const selectedAssetData = selectedAssetType === 'stock' 
      ? stockMarket.getStock(selectedAssetSym) 
      : cryptoMarket.getCrypto(selectedAssetSym);

    // Active Bots HTML
    const activeBotsHTML = piState.bots.length === 0 
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🤖</span>
           <div style="font-weight:700; color: white; font-size: 1rem; margin-bottom: 0.25rem;">Tidak Ada Bot yang Sedang Berjalan</div>
           <div style="font-size:0.8rem;">Pilih mode bot di atas dan deploy alokasi modal Anda untuk mulai menghasilkan cuan otomatis.</div>
         </div>`
      : piState.bots.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          
          let modeBadge = '🌐 PASAR';
          let modeBg = 'rgba(59,130,246,0.15)';
          let modeColor = '#60a5fa';

          if (bot.mode === 'sector') {
            modeBadge = '🗂️ SEKTOR';
            modeBg = 'rgba(139,92,246,0.15)';
            modeColor = '#a855f7';
          } else if (bot.mode === 'asset') {
            modeBadge = '🎯 TOKEN';
            modeBg = 'rgba(16,185,129,0.15)';
            modeColor = '#34d399';
          }

          return `
            <div class="card bot-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem; gap: 0.5rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                      <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${modeBg}; color: ${modeColor}; font-weight: 800;">${modeBadge}</span>
                      <span style="font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-dim); font-weight: 700;">${bot.targetType.toUpperCase()}</span>
                    </div>
                    <div style="font-weight: 800; color: white; font-size: 1rem; display: flex; align-items: center; gap: 0.4rem;">
                      <span>${bot.icon || '🤖'}</span>
                      <span>${bot.targetName}</span>
                    </div>
                  </div>
                  <span style="font-size: 0.8rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 800;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.04);">
                  <div>Modal Awal: <span style="color: white; font-weight:700;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L Bersih: <span style="color: ${color}; font-weight:800;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                  <div>Nilai Sekarang: <span style="color: white; font-weight:700;">$ ${Math.round(Math.max(0, bot.capital + bot.profit)).toLocaleString()}</span></div>
                  <div>Durasi Aktif: <span style="color: var(--text-muted);">${bot.runtimeTicks || 1} Siklus</span></div>
                </div>
              </div>

              <div class="bot-card-actions" style="display: flex; gap: 0.5rem;">
                <button onclick="stopTradingBot(${bot.id})" class="btn btn-secondary btn-sm bot-btn" style="flex: 1; font-size: 0.78rem; font-weight: 800; justify-content: center; height: 38px; color: var(--accent-danger); border-color: rgba(239,68,68,0.25);">
                  Hentikan & Tarik Kas
                </button>
                <button onclick="downloadBotCard(${bot.id}, true)" class="btn btn-secondary btn-sm bot-btn" style="font-size: 0.78rem; font-weight: 800; justify-content: center; height: 38px; padding: 0 12px; border-color: rgba(255,255,255,0.1);" title="Unduh Kartu Performa">
                  🎴 Unduh
                </button>
              </div>
            </div>
          `;
        }).join('');

    // History Bots HTML
    const historyBotsHTML = (!piState.botHistory || piState.botHistory.length === 0)
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <div style="font-size:0.8rem;">Belum ada riwayat perdagangan bot yang selesai.</div>
         </div>`
      : piState.botHistory.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          const dateStr = new Date(bot.stopTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = new Date(bot.stopTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return `
            <div class="card bot-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.85rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 800; color: white; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                      ${bot.icon || '🤖'} ${bot.targetName}
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${dateStr} ${timeStr} • Selesai</div>
                  </div>
                  <span style="font-size: 0.75rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.78rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                  <div>Modal: <span style="color: white; font-weight:600;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L: <span style="color: ${color}; font-weight:700;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                </div>
              </div>
              <button onclick="downloadBotCard(${bot.id}, false)" class="btn btn-secondary btn-sm bot-btn" style="width: 100%; font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; display: flex; align-items: center; gap: 0.25rem; border-color: rgba(255,255,255,0.1);">
                🎴 Unduh Laporan
              </button>
            </div>
          `;
        }).join('');

    // Pre-calculate sectors for Mode B
    const availableSectors = [
      { id: 'Layer 1 (L1)', name: 'Layer 1 & Infra', icon: '⚡', desc: 'Solana, Ethereum, Sui, Avalanche, dll.' },
      { id: 'DeFi & Staking', name: 'DeFi & DEX Protocol', icon: '🦄', desc: 'Uniswap, Aave, Hyperliquid, Tron, dll.' },
      { id: 'AI & Big Data', name: 'Artificial Intelligence', icon: '🧠', desc: 'Bittensor (TAO), Render, Fetch, dll.' },
      { id: 'Meme Coin', name: 'Meme Speculative (High Vol)', icon: '🐕', desc: 'Dogecoin, Shiba Inu, Pepe, dll.' },
      { id: 'Gaming, NFT & Metaverse', name: 'Gaming & Metaverse', icon: '🎮', desc: 'Axie, The Sandbox, Gala, dll.' },
      { id: 'Layer 2 & Interop', name: 'Layer 2 & Interoperability', icon: '🌉', desc: 'Polkadot, Mantle, Arbitrum, dll.' },
      { id: 'DePIN, Cloud & Infra', name: 'DePIN & Decentralized Cloud', icon: '🌐', desc: 'Chainlink, ICP, Hedera, dll.' }
    ];

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: fade-up 0.3s ease;">
        <!-- Setup Area -->
        <div class="card bot-setup-card" style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div>
              <h3 style="font-size: 1.2rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.25rem 0;">
                🤖 AI Trading Bot Engine
              </h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
                Pilih mode trading otomatis: Beroperasi per pasar luas, rotasi sektor kripto, atau presisi per token tunggal.
              </p>
            </div>
          </div>

          <!-- Step 1: Mode Selector (3 Levels) -->
          <div style="margin: 1rem 0;">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.5rem;">
              Langkah 1: Pilih Tingkat Alokasi Bot
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.65rem;">
              <!-- Mode 1: Per Pasar -->
              <div onclick="window.setBotDeploymentMode('market')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-md); border: 1.5px solid ${deployMode === 'market' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'}; background: ${deployMode === 'market' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)'}; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; color: ${deployMode === 'market' ? '#10b981' : 'white'}; font-size: 0.95rem;">
                  <span>🌐</span> Bot Per Pasar
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.3;">
                  Diversifikasi otomatis di seluruh pergerakan indeks pasar secara luas.
                </div>
              </div>

              <!-- Mode 2: Per Sektor -->
              <div onclick="window.setBotDeploymentMode('sector')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-md); border: 1.5px solid ${deployMode === 'sector' ? '#a855f7' : 'rgba(255,255,255,0.08)'}; background: ${deployMode === 'sector' ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)'}; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; color: ${deployMode === 'sector' ? '#c084fc' : 'white'}; font-size: 0.95rem;">
                  <span>🗂️</span> Bot Per Sektor Kripto
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.3;">
                  Rotasi momentum pintar pada koin-koin dalam satu sektor tematik.
                </div>
              </div>

              <!-- Mode 3: Per Token -->
              <div onclick="window.setBotDeploymentMode('asset')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-md); border: 1.5px solid ${deployMode === 'asset' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}; background: ${deployMode === 'asset' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)'}; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; color: ${deployMode === 'asset' ? '#60a5fa' : 'white'}; font-size: 0.95rem;">
                  <span>🎯</span> Bot Per Token Spesifik
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.3;">
                  Fokus trading presisi pada satu aset pilihan dengan modul pencari instan.
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Target Selection Area based on Mode -->
          <div style="background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.65rem;">
              Langkah 2: Tentukan Target Trading
            </div>

            ${deployMode === 'market' ? `
              <!-- Mode A: Market Target Selection -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem;">
                <div onclick="window.selectBotMarketTarget('crypto')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid ${selectedMarket === 'crypto' ? '#10b981' : 'rgba(255,255,255,0.08)'}; background: ${selectedMarket === 'crypto' ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.2)'};">
                  <div style="font-weight: 800; color: white; display:flex; align-items:center; justify-content:space-between;">
                    <span>🪙 Seluruh Pasar Kripto (90 Token)</span>
                    ${selectedMarket === 'crypto' ? '<span style="color:#10b981;">✓ Terpilih</span>' : ''}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;">
                    Aktif 24/7 • Volatilitas Tinggi • Leverage 2x • Mengikuti pergerakan indeks total kripto
                  </div>
                </div>

                <div onclick="window.selectBotMarketTarget('stock')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid ${selectedMarket === 'stock' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}; background: ${selectedMarket === 'stock' ? 'rgba(59,130,246,0.12)' : 'rgba(0,0,0,0.2)'};">
                  <div style="font-weight: 800; color: white; display:flex; align-items:center; justify-content:space-between;">
                    <span>📈 Seluruh Bursa Saham (100 Saham)</span>
                    ${selectedMarket === 'stock' ? '<span style="color:#3b82f6;">✓ Terpilih</span>' : ''}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.3rem;">
                    Jam Pasar Bursa • Dividen Aman • Leverage 1x • Mengikuti pergerakan IHSG & Top Saham
                  </div>
                </div>
              </div>
            ` : ''}

            ${deployMode === 'sector' ? `
              <!-- Mode B: Sector Selection Pills -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
                ${availableSectors.map(sec => `
                  <div onclick="window.selectBotSectorTarget('${sec.id}')" style="cursor: pointer; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid ${selectedSector === sec.id ? '#a855f7' : 'rgba(255,255,255,0.06)'}; background: ${selectedSector === sec.id ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)'}; display:flex; flex-direction:column; gap:0.2rem;">
                    <div style="font-weight: 800; color: white; font-size: 0.85rem; display:flex; justify-content:space-between; align-items:center;">
                      <span>${sec.icon} ${sec.name}</span>
                      ${selectedSector === sec.id ? '<span style="color:#c084fc; font-size:0.75rem;">✓</span>' : ''}
                    </div>
                    <div style="font-size: 0.68rem; color: var(--text-muted);">${sec.desc}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${deployMode === 'asset' ? `
              <!-- Mode C: Single Asset Picker with Search Module -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                  <button type="button" onclick="window.openBotAssetPickerModal()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; min-height: 40px; font-weight: 800; font-size: 0.82rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                    <span>🔍</span> Cari & Pilih Token Kripto / Saham
                  </button>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">
                    Pilih koin apa saja dari 90 token kripto atau 100 saham bursa efek.
                  </span>
                </div>

                <!-- Selected Asset Card Preview -->
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid rgba(59,130,246,0.3); border-radius: var(--radius-sm); padding: 0.75rem 1rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <span style="font-size: 1.6rem;">${selectedAssetData?.icon || '🪙'}</span>
                    <div>
                      <div style="font-weight: 800; color: white; font-size: 1rem;">
                        ${selectedAssetData?.name || selectedAssetSym} (${selectedAssetSym})
                      </div>
                      <div style="font-size: 0.72rem; color: var(--text-dim);">
                        ${selectedAssetData?.sector || selectedAssetType.toUpperCase()} • Harga: $${(selectedAssetData?.price || 1).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; background: ${(selectedAssetData?.change || 0) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${(selectedAssetData?.change || 0) >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800;">
                      ${(selectedAssetData?.change || 0) >= 0 ? '+' : ''}${(selectedAssetData?.change || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Step 3: Capital Allocation Input & Presets -->
          <div style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <label class="form-label" style="font-size: 0.75rem; margin: 0; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                Langkah 3: Alokasi Modal Bot ($)
              </label>
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                Saldo Kas Tersedia: <strong style="color: #10b981;">$ ${gameState.getBalance().toLocaleString()}</strong>
              </span>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <input type="number" id="bot-capital-input" class="form-input" placeholder="Masukkan jumlah modal..." value="5000" min="500" 
                style="flex: 1; min-width: 180px; min-height: 42px; background: var(--bg-surface); color: white; padding: 0.5rem 0.85rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700;">
              
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                <button type="button" onclick="window.setBotCapitalPreset(1000)" class="btn btn-secondary btn-sm" style="min-height: 42px; font-size: 0.75rem; font-weight: 700; padding: 0 10px;">$1.000</button>
                <button type="button" onclick="window.setBotCapitalPreset(5000)" class="btn btn-secondary btn-sm" style="min-height: 42px; font-size: 0.75rem; font-weight: 700; padding: 0 10px;">$5.000</button>
                <button type="button" onclick="window.setBotCapitalPreset(25000)" class="btn btn-secondary btn-sm" style="min-height: 42px; font-size: 0.75rem; font-weight: 700; padding: 0 10px;">$25.000</button>
                <button type="button" onclick="window.setBotCapitalPreset('max')" class="btn btn-primary btn-sm" style="min-height: 42px; font-size: 0.75rem; font-weight: 800; padding: 0 12px; background: rgba(16,185,129,0.18); color:#10b981; border-color: rgba(16,185,129,0.35);">Max Kas</button>
              </div>
            </div>
          </div>

          <!-- Deploy Submit Button -->
          <div style="display: flex; justify-content: flex-end;">
            <button onclick="window.deployNewTradingBot()" class="btn btn-primary bot-deploy-btn" style="min-height: 44px; width: 100%; font-size: 0.9rem; font-weight: 800; display: flex; align-items:center; justify-content:center; gap: 0.5rem; background: linear-gradient(135deg, var(--accent-primary) 0%, #059669 100%); box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
              🚀 Deploy Trading Bot Sekarang
            </button>
          </div>
        </div>

        <!-- Active Bots Area -->
        <div class="card" style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">
            ⚡ Trading Bot Aktif (${piState.bots.length})
          </h3>
          <div class="bot-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; width: 100%;">
            ${activeBotsHTML}
          </div>
        </div>

        <!-- History Bots Area -->
        <div class="card" style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">
            📜 Riwayat Trading Bot Selesai
          </h3>
          <div class="bot-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
            ${historyBotsHTML}
          </div>
        </div>
      </div>
    `;
}

export function bindPassiveIncomeButtons() {
    const botCapitalInput = document.getElementById('bot-capital-input');
    if (botCapitalInput) {
      ui.setupNumericInput(botCapitalInput, {
        isDecimal: false,
        showZeroAppend: true,
        showMax: true,
        maxAmount: () => gameState.getBalance()
      });
    }
}

// Global action handlers for passive income buttons
if (typeof window !== 'undefined') {
    const notifyView = () => {
        if (typeof window._refreshPassiveIncomeView === 'function') {
            window._refreshPassiveIncomeView();
        }
    };

    window._refreshPassiveIncomeView = () => {
      renderPassiveIncomePage();
    };

    window._setPassiveView = (tab) => {
      currentPassiveSubTab = tab;
      renderPassiveIncomePage();
    };

    // Staking Filter & Search
    window.setStakingFilterTab = (tab) => {
      window._stakingFilterTab = tab;
      notifyView();
    };

    window.setStakingSearch = (query) => {
      window._stakingSearchQuery = query;
      notifyView();
      const input = document.getElementById('staking-search-input');
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    };

    // Interactive Staking Modal
    window.openStakingModal = (symbol) => {
      const crypto = cryptoMarket.getCrypto(symbol);
      const spec = passiveIncomeManager.getStakingPool(symbol);
      const wallet = gameState.get('crypto') || {};
      const holding = wallet[symbol];
      const maxAmt = holding ? holding.amount : 0;
      const price = crypto ? crypto.price : 1.0;

      if (!spec) {
        ui.error(`Staking pool untuk ${symbol} tidak ditemukan.`);
        return;
      }
      if (maxAmt <= 0) {
        ui.error(`Saldo ${symbol} di wallet Anda kosong. Silakan beli koin di Pasar Kripto terlebih dahulu.`);
        return;
      }

      const baseApy = spec.apy || 0.06;
      const lockedApy = baseApy * 1.35;

      const modalContent = `
        <div style="display: flex; flex-direction: column; gap: 1.15rem; color: white;">
          <!-- Coin Header Info -->
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 2rem;">${crypto?.icon || '🪙'}</span>
              <div>
                <div style="font-weight: 800; font-size: 1.1rem;">${spec.name} (${symbol})</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${spec.sector || 'Kripto'} • $${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Saldo Wallet</div>
              <div style="font-weight: 800; color: #10b981; font-size: 0.95rem;">${cryptoMarket.formatAmount(maxAmt)} ${symbol}</div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">$${(maxAmt * price).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            </div>
          </div>

          <!-- Staking Duration Type: Flexible vs Locked 30D -->
          <div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.4rem;">
              Pilih Durasi Staking Vault
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
              <div id="staking-opt-flexible" onclick="window.setStakingModalLockType('flexible')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid var(--accent-primary); background: rgba(16,185,129,0.12);">
                <div style="font-weight: 800; color: #10b981; font-size: 0.9rem; display: flex; justify-content: space-between;">
                  <span>🔓 Fleksibel</span>
                  <span>${(baseApy * 100).toFixed(1)}% APY</span>
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Unstake kapan saja tanpa denda. Reward cair setiap waktu.
                </div>
              </div>

              <div id="staking-opt-locked" onclick="window.setStakingModalLockType('locked')" style="cursor: pointer; padding: 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2);">
                <div style="font-weight: 800; color: white; font-size: 0.9rem; display: flex; justify-content: space-between;">
                  <span>🔒 Locked 30 Hari</span>
                  <span style="color: #f59e0b;">${(lockedApy * 100).toFixed(1)}% APY</span>
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Bonus +35% yield reward! Komitmen 30 hari.
                </div>
              </div>
            </div>
          </div>

          <!-- Amount Input Area -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <label class="form-label" style="font-size: 0.72rem; margin: 0; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Jumlah Staking (${symbol})</label>
              <span style="font-size: 0.72rem; color: var(--text-dim);">Max: ${maxAmt.toFixed(4)} ${symbol}</span>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <input type="number" id="staking-modal-amt" class="form-input" placeholder="0.00" value="${(maxAmt * 0.5).toFixed(4)}" step="any" max="${maxAmt}" 
                style="flex: 1; min-height: 42px; background: var(--bg-surface); color: white; padding: 0.5rem 0.85rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; font-weight: 700;" 
                oninput="window.updateStakingModalEstimates('${symbol}', ${price}, ${baseApy})">
            </div>
            
            <!-- Quick Preset Percentages -->
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" onclick="window.setStakingModalPercent('${symbol}', 0.25, ${maxAmt}, ${price}, ${baseApy})" class="btn btn-secondary btn-sm" style="flex:1; min-height:34px; font-size:0.75rem; font-weight:700;">25%</button>
              <button type="button" onclick="window.setStakingModalPercent('${symbol}', 0.50, ${maxAmt}, ${price}, ${baseApy})" class="btn btn-secondary btn-sm" style="flex:1; min-height:34px; font-size:0.75rem; font-weight:700;">50%</button>
              <button type="button" onclick="window.setStakingModalPercent('${symbol}', 0.75, ${maxAmt}, ${price}, ${baseApy})" class="btn btn-secondary btn-sm" style="flex:1; min-height:34px; font-size:0.75rem; font-weight:700;">75%</button>
              <button type="button" onclick="window.setStakingModalPercent('${symbol}', 1.00, ${maxAmt}, ${price}, ${baseApy})" class="btn btn-primary btn-sm" style="flex:1; min-height:34px; font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.2); color:#10b981; border-color:rgba(16,185,129,0.4);">100% (Max)</button>
            </div>
          </div>

          <!-- Live Reward Estimation Calculator -->
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 0.78rem;">
            <div style="color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; font-weight: 700; margin-bottom: 0.4rem;">Simulasi Estimasi Yield Pasif</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <span style="color: var(--text-muted);">Est. Harian:</span>
                <span id="staking-est-daily" style="font-weight: 800; color: #10b981; margin-left: 0.3rem;">+0.0000 ${symbol}</span>
              </div>
              <div>
                <span style="color: var(--text-muted);">Est. 30 Hari:</span>
                <span id="staking-est-monthly" style="font-weight: 800; color: #38bdf8; margin-left: 0.3rem;">+0.0000 ${symbol}</span>
              </div>
            </div>
          </div>

          <!-- Confirm Action Button -->
          <button onclick="window.confirmStakingSubmission('${symbol}', ${maxAmt})" class="btn btn-primary" style="min-height: 44px; width: 100%; font-weight: 800; font-size: 0.9rem; justify-content: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
            🔒 Konfirmasi Staking Sekarang
          </button>
        </div>
      `;

      window._activeModalLockType = 'flexible';
      ui.showModal({
        title: `⚡ Smart Staking Vault: ${spec.name}`,
        content: modalContent,
        onShow: () => {
          window.updateStakingModalEstimates(symbol, price, baseApy);
        }
      });
    };

    window.setStakingModalLockType = (type) => {
      window._activeModalLockType = type;
      const optFlex = document.getElementById('staking-opt-flexible');
      const optLock = document.getElementById('staking-opt-locked');
      if (optFlex && optLock) {
        if (type === 'flexible') {
          optFlex.style.borderColor = 'var(--accent-primary)';
          optFlex.style.background = 'rgba(16,185,129,0.12)';
          optLock.style.borderColor = 'rgba(255,255,255,0.08)';
          optLock.style.background = 'rgba(0,0,0,0.2)';
        } else {
          optLock.style.borderColor = '#f59e0b';
          optLock.style.background = 'rgba(245,158,11,0.15)';
          optFlex.style.borderColor = 'rgba(255,255,255,0.08)';
          optFlex.style.background = 'rgba(0,0,0,0.2)';
        }
      }
    };

    window.setStakingModalPercent = (symbol, pct, maxAmt, price, baseApy) => {
      const input = document.getElementById('staking-modal-amt');
      if (input) {
        const val = maxAmt * pct;
        input.value = val.toFixed(4);
        window.updateStakingModalEstimates(symbol, price, baseApy);
      }
    };

    window.updateStakingModalEstimates = (symbol, price, baseApy) => {
      const input = document.getElementById('staking-modal-amt');
      const dailyEl = document.getElementById('staking-est-daily');
      const monthlyEl = document.getElementById('staking-est-monthly');
      if (!input || !dailyEl || !monthlyEl) return;

      const amt = parseFloat(input.value) || 0;
      const isLocked = window._activeModalLockType === 'locked';
      const apy = isLocked ? baseApy * 1.35 : baseApy;

      const dailyTokens = (amt * apy) / 365;
      const monthlyTokens = dailyTokens * 30;

      dailyEl.textContent = `+${dailyTokens.toFixed(4)} ${symbol} (+$${(dailyTokens * price).toFixed(2)})`;
      monthlyEl.textContent = `+${monthlyTokens.toFixed(4)} ${symbol} (+$${(monthlyTokens * price).toFixed(2)})`;
    };

    window.confirmStakingSubmission = (symbol, maxAmt) => {
      const input = document.getElementById('staking-modal-amt');
      const amt = parseFloat(input?.value);
      if (isNaN(amt) || amt <= 0) {
        ui.error('Masukkan jumlah token yang valid');
        return;
      }
      if (amt > maxAmt) {
        ui.error('Jumlah staking melebihi saldo wallet Anda');
        return;
      }

      const lockType = window._activeModalLockType || 'flexible';
      try {
        passiveIncomeManager.stake(symbol, amt, lockType);
        ui.closeModal();
        ui.success(`Berhasil staking ${amt.toFixed(4)} ${symbol} (${lockType === 'locked' ? 'Locked 30H' : 'Fleksibel'})!`, 'Staking Vault');
        notifyView();
      } catch (err) {
        ui.error(err.message);
      }
    };

    window.unstakeCryptoPrompt = async (symbol) => {
      try {
        const piState = passiveIncomeManager.getState();
        const maxAmt = piState.staked[symbol] || 0;
        if (maxAmt <= 0) return;

        const inputVal = await ui.prompt({
          title: `Unstake ${symbol}`,
          message: `Masukkan jumlah ${symbol} yang ingin ditarik kembali ke wallet (Max: ${maxAmt.toFixed(4)})`,
          placeholder: '0.00',
          defaultValue: maxAmt.toFixed(4),
          isNumeric: true
        });
        if (inputVal) {
          const amt = parseFloat(inputVal);
          if (isNaN(amt) || amt <= 0 || amt > maxAmt) { ui.error('Jumlah input tidak valid'); return; }
          passiveIncomeManager.unstake(symbol, amt);
          ui.success(`Berhasil unstaking ${amt.toFixed(4)} ${symbol}!`, 'Staking Vault');
          notifyView();
        }
      } catch(e) { ui.error(e.message); }
    };

    window.claimStakingReward = (symbol) => {
      try {
        passiveIncomeManager.claimStaking(symbol);
        ui.success(`Berhasil mengklaim reward staking ${symbol}!`, 'Klaim Staking', { deviceNotify: true });
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.claimAllStakingRewards = () => {
      try {
        passiveIncomeManager.claimAllStaking();
        ui.success('Seluruh reward staking berhasil diklaim ke wallet!', 'Klaim Semua Staking', { deviceNotify: true });
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    // Bot Configuration Handlers
    window.setBotDeploymentMode = (mode) => {
      window._botDeployMode = mode;
      notifyView();
    };

    window.selectBotMarketTarget = (market) => {
      window._botSelectedMarket = market;
      notifyView();
    };

    window.selectBotSectorTarget = (sector) => {
      window._botSelectedSector = sector;
      notifyView();
    };

    window.setBotCapitalPreset = (preset) => {
      const input = document.getElementById('bot-capital-input');
      if (!input) return;
      if (preset === 'max') {
        input.value = Math.max(500, Math.floor(gameState.getBalance()));
      } else {
        input.value = preset;
      }
    };

    // Mature Asset Picker Modal for Mode C
    window.openBotAssetPickerModal = () => {
      const allCryptos = cryptoMarket ? Object.values(cryptoMarket.cryptos || {}) : [];
      const allStocks = stockMarket ? Object.values(stockMarket.stocks || {}) : [];

      const renderAssetList = (filterQuery = '', sectorFilter = 'ALL') => {
        let assets = [];
        allCryptos.forEach(c => {
          assets.push({
            symbol: c.symbol,
            name: c.name,
            price: c.price,
            change: c.change,
            sector: c.sector || 'Kripto',
            icon: c.icon || '🪙',
            type: 'crypto'
          });
        });
        allStocks.forEach(s => {
          assets.push({
            symbol: s.symbol,
            name: s.name,
            price: s.price,
            change: s.change,
            sector: s.sector || 'Saham',
            icon: '📈',
            type: 'stock'
          });
        });

        if (sectorFilter !== 'ALL') {
          assets = assets.filter(a => a.sector === sectorFilter || (sectorFilter === 'Saham' && a.type === 'stock'));
        }

        if (filterQuery) {
          const q = filterQuery.toLowerCase();
          assets = assets.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.sector.toLowerCase().includes(q));
        }

        // Sort by volume/market presence
        assets.sort((a, b) => (b.price || 0) - (a.price || 0));

        return assets.map(a => {
          const up = (a.change || 0) >= 0;
          return `
            <div onclick="window.selectBotAsset('${a.symbol}', '${a.type}')" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); transition: all 0.15s ease;" onmouseover="this.style.background='rgba(59,130,246,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-size: 1.4rem;">${a.icon}</span>
                <div>
                  <div style="font-weight: 800; color: white; font-size: 0.9rem;">${a.name} <span style="font-size: 0.72rem; color: var(--text-dim); font-weight:700;">${a.symbol}</span></div>
                  <div style="font-size: 0.68rem; color: var(--text-muted);">${a.sector} • ${a.type.toUpperCase()}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 800; color: white; font-size: 0.85rem;">$${a.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                <div style="font-size: 0.72rem; font-weight: 700; color: ${up ? '#10b981' : '#ef4444'};">${up ? '+' : ''}${(a.change || 0).toFixed(2)}%</div>
              </div>
            </div>
          `;
        }).join('');
      };

      const modalHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Search Input -->
          <div style="position: relative;">
            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
            <input type="text" id="bot-picker-search-input" placeholder="Cari token, saham, atau sektor..." 
              style="width: 100%; min-height: 40px; padding: 0.5rem 0.75rem 0.5rem 2.2rem; background: var(--bg-surface); color: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem;" 
              oninput="window.filterBotPickerList(this.value)">
          </div>

          <!-- Sector Quick Filter Chips -->
          <div style="display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px;">
            <button class="btn btn-sm" onclick="window.setBotPickerSector('ALL')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: var(--accent-primary-soft); color: var(--accent-primary); white-space:nowrap;">Semua</button>
            <button class="btn btn-sm" onclick="window.setBotPickerSector('Layer 1 (L1)')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); white-space:nowrap;">⚡ Layer 1</button>
            <button class="btn btn-sm" onclick="window.setBotPickerSector('DeFi & Staking')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); white-space:nowrap;">🦄 DeFi</button>
            <button class="btn btn-sm" onclick="window.setBotPickerSector('AI & Big Data')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); white-space:nowrap;">🧠 AI</button>
            <button class="btn btn-sm" onclick="window.setBotPickerSector('Meme Coin')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); white-space:nowrap;">🐕 Meme</button>
            <button class="btn btn-sm" onclick="window.setBotPickerSector('Saham')" style="font-size: 0.72rem; padding: 4px 8px; border: none; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); white-space:nowrap;">📈 Saham</button>
          </div>

          <!-- Scrollable Assets List -->
          <div id="bot-picker-list-container" style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 52vh; overflow-y: auto; padding-right: 2px;">
            ${renderAssetList()}
          </div>
        </div>
      `;

      window._activePickerSector = 'ALL';
      window.filterBotPickerList = (q) => {
        const container = document.getElementById('bot-picker-list-container');
        if (container) {
          container.innerHTML = renderAssetList(q, window._activePickerSector);
        }
      };

      window.setBotPickerSector = (sector) => {
        window._activePickerSector = sector;
        const searchVal = document.getElementById('bot-picker-search-input')?.value || '';
        const container = document.getElementById('bot-picker-list-container');
        if (container) {
          container.innerHTML = renderAssetList(searchVal, sector);
        }
      };

      ui.showModal({
        title: '🔍 Pilih Aset untuk Trading Bot',
        content: modalHTML
      });
    };

    window.selectBotAsset = (symbol, type) => {
      window._botSelectedAsset = symbol;
      window._botSelectedAssetType = type;
      ui.closeModal();
      notifyView();
    };

    window.deployNewTradingBot = () => {
      const mode = window._botDeployMode || 'market';
      const capitalInput = document.getElementById('bot-capital-input');
      const capital = capitalInput ? (capitalInput.getNumericValue ? capitalInput.getNumericValue() : parseFloat(capitalInput.value)) : NaN;

      if (isNaN(capital) || capital <= 0) {
        ui.error('Masukkan jumlah modal yang valid untuk menjalankan bot');
        return;
      }

      let config = {
        mode: mode,
        capital: capital
      };

      if (mode === 'market') {
        const market = window._botSelectedMarket || 'crypto';
        config.targetId = market;
        config.targetType = market === 'stock' ? 'stock' : 'crypto';
        config.targetName = market === 'stock' ? 'Indeks Total Bursa Saham' : 'Indeks Total Pasar Kripto';
        config.icon = market === 'stock' ? '📈' : '🪙';
      } else if (mode === 'sector') {
        const sector = window._botSelectedSector || 'DeFi & Staking';
        config.targetId = sector;
        config.targetType = 'crypto';
        config.targetName = `Sektor ${sector}`;
        config.icon = '🗂️';
      } else {
        const symbol = window._botSelectedAsset || 'BTC';
        const type = window._botSelectedAssetType || 'crypto';
        const asset = type === 'stock' ? stockMarket.getStock(symbol) : cryptoMarket.getCrypto(symbol);
        config.targetId = symbol;
        config.targetType = type;
        config.targetName = `${asset ? asset.name : symbol} (${symbol})`;
        config.icon = asset ? asset.icon : '🎯';
        config.entryPrice = asset ? asset.price : 1.0;
      }

      try {
        passiveIncomeManager.startBot(config);
        ui.success(`🎉 ${config.targetName} berhasil dideploy dengan modal $${capital.toLocaleString()}!`, 'Deploy Bot', { deviceNotify: true });
        notifyView();
      } catch (err) {
        ui.error(err.message);
      }
    };

    window.stopTradingBot = (id) => {
      try {
        passiveIncomeManager.stopBot(id);
        ui.success('Bot berhasil dihentikan dan seluruh modal serta laba bersih dikreditkan ke kas!', 'Bot Stopped', { deviceNotify: true });
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.changePassiveView = (view) => {
      if (typeof window._setPassiveView === 'function') {
        window._setPassiveView(view);
      }
      notifyView();
    };

    window.commitLaunchdropPrompt = async (id) => {
      try {
        const state = passiveIncomeManager.getState();
        const ld = (state.launchdrops || []).find(l => l.id === id);
        if (!ld) { ui.error('Pool tidak ditemukan'); return; }

        const balance = gameState.getBalance();
        if (balance <= 0) { ui.error('Saldo kas Anda kosong'); return; }

        const isPool = ld.type === 'launchpool';
        const title = isPool ? `Stake Kas ke Launchpool ${ld.name}` : `Beli Presale Diskon 50% ${ld.name}`;

        const amount = await ui.promptMoney({
          title,
          maxAmount: balance,
          confirmText: isPool ? 'Stake Kas' : 'Beli Presale'
        });

        if (amount) {
          passiveIncomeManager.commitLaunchdrop(id, amount);
          if (isPool) {
            ui.success(`Berhasil stake $${amount.toLocaleString()} ke Launchpool ${ld.name}! Modal kas aman 100% dan akan dikembalikan saat klaim.`, 'Launchpool');
          } else {
            ui.success(`Berhasil membeli presale $${amount.toLocaleString()} untuk ${ld.name}! Alokasi diskon 50% Anda siap di-trade setelah 5 jam.`, 'Launchpad Presale');
          }
          notifyView();
        }
      } catch(e) { ui.error(e.message); }
    };

    window.claimLaunchdropReward = (id) => {
      try {
        const res = passiveIncomeManager.claimLaunchdrop(id);
        if (res.type === 'launchpool') {
          ui.success(`🎉 Berhasil! Modal pokok $${res.refundCash.toLocaleString()} kembali 100% + reward airdrop ${res.tokenReward.toFixed(4)} ${res.symbol} masuk ke wallet!`, 'Klaim Launchpool', { deviceNotify: true });
        } else {
          ui.success(`🚀 Berhasil! ${res.allocatedTokens.toFixed(2)} ${res.symbol} hasil presale diskon 50% telah masuk dompet! Token resmi listing dan siap di-trade di pasar!`, 'Klaim Launchpad', { deviceNotify: true });
        }
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.simulateFastForwardLaunchdrop = (id) => {
      try {
        const ld = passiveIncomeManager.simulateNextPhase(id);
        if (ld.status === 'ACTIVE') {
          ui.info(`⚡ Mode Uji Coba: ${ld.name} sekarang DIBUKA (Active) selama ${ld.timeRemaining} detik untuk pengujian!`, 'Tes Mode');
        } else if (ld.status === 'CLAIMABLE') {
          ui.success(`⚡ Mode Uji Coba: Durasi pool ${ld.name} selesai! Status berubah menjadi SIAP DIKLAIM (Claimable)!`, 'Tes Mode');
        }
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.openCryptoTrade = (symbol) => {
      if (typeof window.game?.ui?.viewManager?.switchMarketTab === 'function') {
        window.game.ui.viewManager.switchMarketTab('crypto');
      } else if (typeof window.switchMarketTab === 'function') {
        window.switchMarketTab('crypto');
      } else if (typeof window.viewManager?.switchMarketTab === 'function') {
        window.viewManager.switchMarketTab('crypto');
      }
    };

    window.downloadBotCard = (id, isActive) => {
      const state = passiveIncomeManager.getState();
      const bot = isActive 
        ? state.bots.find(b => b.id == id)
        : (state.botHistory || []).find(b => b.id == id);
      
      if (!bot) {
        ui.error("Data bot tidak ditemukan!");
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      
      const grad = ctx.createLinearGradient(0, 0, 600, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 360);
      
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 596, 356);
      
      const isProfit = bot.profit >= 0;
      const glowColor = isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const glowGrad = ctx.createRadialGradient(500, 100, 10, 500, 100, 220);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 600, 360);

      ctx.font = 'bold 20px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#6366f1';
      ctx.fillText('AURA ASSETS', 40, 50);
      
      ctx.font = 'bold 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillText('AUTOMATED TRADING ENGINE', 40, 70);
      
      const badgeText = isActive ? 'RUNNING' : 'CLOSED';
      const badgeColor = isActive ? '#3b82f6' : '#94a3b8';
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(460, 35, 100, 28, 6);
      } else {
        ctx.rect(460, 35, 100, 28);
      }
      ctx.fill();
      
      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, 510, 53);
      ctx.textAlign = 'left';
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 95);
      ctx.lineTo(560, 95);
      ctx.stroke();
      
      ctx.font = 'bold 36px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(bot.targetName || bot.asset || 'AI BOT', 40, 145);
      
      ctx.font = '600 12px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${(bot.mode || 'BOT').toUpperCase()} • Multi-Tier Auto-Trading`, 40, 168);
      
      ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('MODAL ALOKASI', 40, 215);
      ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`$${bot.capital.toLocaleString()}`, 40, 245);
      
      ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('NET PROFIT/LOSS', 230, 215);
      ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = isProfit ? '#10b981' : '#ef4444';
      const sign = isProfit ? '+' : '';
      ctx.fillText(`${sign}$${Math.round(bot.profit).toLocaleString()}`, 230, 245);
      
      ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('ESTIMATED ROI', 420, 215);
      ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = isProfit ? '#10b981' : '#ef4444';
      ctx.fillText(`${sign}${bot.profitPct.toFixed(2)}%`, 420, 245);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(40, 280);
      ctx.lineTo(560, 280);
      ctx.stroke();
      
      ctx.font = '11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      const timeStr = bot.stopTime ? new Date(bot.stopTime).toLocaleString() : 'Running...';
      ctx.fillText(`Durasi: ${bot.runtimeTicks || 0} Siklus  |  Waktu: ${timeStr}`, 40, 315);
      
      ctx.textAlign = 'right';
      ctx.fillText('aura-assets.com', 560, 315);
      ctx.textAlign = 'left';
      
      try {
        const link = document.createElement('a');
        link.download = `aura_bot_${bot.targetId || bot.asset}_${bot.id.toString().slice(-6)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        ui.success('Kartu performa bot berhasil diunduh!', 'Download Card');
      } catch(err) {
        ui.error('Gagal mengunduh gambar kartu: ' + err.message);
      }
    };
}

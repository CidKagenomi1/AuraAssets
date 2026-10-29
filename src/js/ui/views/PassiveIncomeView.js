/**
 * PassiveIncomeView.js - Unified View & Handlers for Staking, Mining, Launchdrops, and Trading Bots
 * Part of modular views structure
 */

import passiveIncomeManager from '../../trading/PassiveIncomeManager.js';
import gameState from '../../core/GameState.js';
import stockMarket from '../../trading/StockMarket.js';
import cryptoMarket from '../../trading/CryptoMarket.js';
import ui from '../UIManager.js';

export function renderPassiveIncomeView(activeView = 'staking') {
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
              <option value="mining" ${activeView === 'mining' ? 'selected' : ''}>⛏️ Rig Pertambangan</option>
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

    const stakingHTML = Object.entries(passiveIncomeManager.stakingAssets).map(([symbol, spec]) => {
      const holding = wallet[symbol];
      const walletAmt = holding ? holding.amount : 0;
      const stakedAmt = piState.staked[symbol] || 0;
      const pendingReward = piState.stakingRewards?.[symbol] || 0;
      const crypto = cryptoMarket.getCrypto(symbol);
      const coinIcon = crypto ? crypto.icon : '🪙';
      const apyPct = (spec.apy * 100).toFixed(1);

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 200px;">
            <span style="font-size: 1.75rem; width: 32px; text-align:center;">${coinIcon}</span>
            <div>
              <div style="font-weight: 800; color: white;">${spec.name} (${symbol})</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Saldo Wallet: <span style="color: white;">${cryptoMarket.formatAmount(walletAmt)}</span> | 
                Staked: <span style="color: var(--accent-primary); font-weight:700;">${cryptoMarket.formatAmount(stakedAmt)}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 1.25rem; margin-left: auto;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Reward Pending</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #10b981; text-align: right;">+${cryptoMarket.formatAmount(pendingReward)} ${symbol}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Est. APY</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-primary); text-align: right;">${apyPct}%</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button onclick="stakeCryptoPrompt('${symbol}')" class="btn btn-primary btn-sm" style="font-size: 0.7rem; font-weight: 800; padding: 4px 12px; height: 28px; justify-content:center;" ${walletAmt <= 0 ? 'disabled' : ''}>Stake</button>
              ${stakedAmt > 0 ? `<button onclick="unstakeCryptoPrompt('${symbol}')" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; font-weight: 800; padding: 4px 12px; height: 28px; justify-content:center; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">Unstake</button>` : ''}
              ${pendingReward > 0 ? `<button onclick="claimStakingReward('${symbol}')" class="btn btn-primary btn-sm" style="font-size: 0.7rem; font-weight: 800; padding: 4px 12px; height: 28px; justify-content:center; background: #10b981; border-color: #10b981;">Klaim</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    let totalPendingRewards = 0;
    if (piState.stakingRewards) {
      Object.values(piState.stakingRewards).forEach(r => totalPendingRewards += r);
    }

    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem;">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:white; display:flex; align-items:center; gap:0.4rem;">🔒 Vault Staking Kripto</h4>
            <p style="font-size:0.75rem; color:var(--text-muted);">Kunci aset kripto Anda di Smart Contract Staking untuk mendapatkan yield APY pasif secara kontinu.</p>
          </div>
          ${totalPendingRewards > 0 ? `<button onclick="claimAllStakingRewards()" class="btn btn-primary btn-sm" style="font-size:0.75rem; font-weight:800; background: #10b981; border-color:#10b981;">Klaim Semua Yield</button>` : ''}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${stakingHTML}
        </div>
      </div>
    `;
}

export function renderStakingMiningView_OnlyMining() {
    const piState = passiveIncomeManager.getState();
    const btc = cryptoMarket.getCrypto('BTC');
    const btcPrice = btc ? btc.price : 60000;

    let totalYieldBTC = 0;
    let totalPowerCost = 0;
    Object.entries(piState.rigs).forEach(([type, count]) => {
      const rig = passiveIncomeManager.rigTypes[type];
      totalYieldBTC += rig.yieldBTC * count;
      totalPowerCost += rig.powerCost * count;
    });

    const estEarnUSD = totalYieldBTC * btcPrice;
    const pendingMiningReward = piState.miningRewards || 0;

    const rigsHTML = Object.entries(passiveIncomeManager.rigTypes).map(([type, rig]) => {
      const count = piState.rigs[type] || 0;
      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span style="font-weight: 800; color: white; font-size: 0.95rem;">${rig.name}</span>
              <span style="font-size: 0.8rem; background: var(--accent-primary-soft); color: var(--accent-primary); padding: 2px 8px; border-radius: 99px; font-weight: 700;">${count} Rig</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
              <div>Harga: <span style="color: white; font-weight:600;">$ ${rig.cost.toLocaleString()}</span></div>
              <div>Hasil: <span style="color: #f59e0b; font-weight:600;">+${(rig.yieldBTC * 105120).toFixed(4)} BTC/th</span></div>
              <div>Listrik: <span style="color: var(--accent-danger); font-weight:600;">$ ${Math.round(rig.powerCost).toLocaleString()}/tick</span></div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="buyMiningRig('${type}')" class="btn btn-primary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight:700; height: 32px; justify-content:center;">Beli Rig</button>
            ${count > 0 ? `<button onclick="sellMiningRig('${type}')" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; font-weight:700; height: 32px; justify-content:center; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">Jual</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 1rem;">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:white; display:flex; align-items:center; gap:0.4rem;">⛏️ Rig Pertambangan Kripto</h4>
            <p style="font-size:0.75rem; color:var(--text-muted);">Beli rig untuk menambang Bitcoin (BTC) secara otomatis setiap tick. Biaya listrik akan dikurangi dari kas Anda.</p>
          </div>
          <div style="display:flex; gap:0.75rem; align-items:center;">
            <div style="text-align: right; background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Hasil Tambang Belum Diklaim</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #f59e0b; text-shadow:0 0 8px rgba(245,158,11,0.25);">${cryptoMarket.formatAmount(pendingMiningReward)} BTC</div>
              <div style="font-size: 0.75rem; color: var(--accent-primary); font-weight:600;">≈ $ ${estEarnUSD.toFixed(2)}/tick (Listrik: $ ${totalPowerCost.toFixed(0)})</div>
            </div>
            ${pendingMiningReward > 0 ? `<button onclick="claimMiningRewards()" class="btn btn-primary" style="background:#f59e0b; border-color:#f59e0b; height:46px; font-weight:800; font-size:0.85rem;">Klaim Hasil</button>` : ''}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;">
          ${rigsHTML}
        </div>
      </div>
    `;
}

export function renderLaunchdropView() {
    const piState = passiveIncomeManager.getState();

    const launchdropsHTML = (piState.launchdrops || []).map(ld => {
      const isClaimable = ld.status === 'CLAIMABLE';
      const isEnded = ld.status === 'ENDED';
      const rewardAmt = ld.committed * ld.rate;

      let statusBadgeColor = 'rgba(59,130,246,0.12)';
      let statusTextColor = '#3b82f6';
      let statusText = 'ACTIVE 🟢';

      if (isClaimable) {
        statusBadgeColor = 'rgba(16,185,129,0.12)';
        statusTextColor = '#10b981';
        statusText = 'CLAIMABLE 🎁';
      } else if (isEnded) {
        statusBadgeColor = 'rgba(255,255,255,0.06)';
        statusTextColor = 'var(--text-muted)';
        statusText = 'ENDED 🏁';
      }

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <div>
                <span style="font-weight: 800; color: white; font-size: 1.05rem;">${ld.name} (${ld.symbol})</span>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top:0.25rem;">Rate: 1 USD ≈ ${ld.rate} ${ld.symbol}</div>
              </div>
              <span style="font-size: 0.72rem; background: ${statusBadgeColor}; color: ${statusTextColor}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                ${statusText}
              </span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 0.75rem;">${ld.desc}</p>
            
            <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
              <div>Committed: <span style="color: white; font-weight:600;">$ ${ld.committed.toLocaleString()}</span></div>
              <div>Est. Reward: <span style="color: #10b981; font-weight:700;">+${rewardAmt.toFixed(2)} ${ld.symbol}</span></div>
              <div style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top:0.35rem; margin-top:0.15rem;">
                ${isEnded ? 'Durasi Berakhir' : `Sisa Waktu: <span style="color: white; font-weight:600;">${ld.timeRemaining} tick</span>`}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${ld.status === 'ACTIVE' ? `
              <button onclick="commitLaunchdropPrompt('${ld.id}')" class="btn btn-primary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight:800; height:32px; justify-content:center;">Commit Modal</button>
            ` : ''}
            ${isClaimable ? `
              <button onclick="claimLaunchdropReward('${ld.id}')" class="btn btn-primary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight:800; height:32px; justify-content:center; background:#10b981; border-color:#10b981;">Klaim Token</button>
            ` : ''}
            ${isEnded ? `
              <button class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight:800; height:32px; justify-content:center;" disabled>Alokasi Diklaim</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <div style="border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <h4 style="font-size:1.05rem; font-weight:800; color:white; display:flex; align-items:center; gap:0.4rem;">🚀 Launchdrop Kripto</h4>
          <p style="font-size:0.75rem; color:var(--text-muted);">Commit kas Anda ke presale proyek token kripto baru untuk mendapatkan airdrop alokasi besar saat proyek diluncurkan.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
          ${launchdropsHTML}
        </div>
      </div>
    `;
}

export function renderBotTradingView() {
    const piState = passiveIncomeManager.getState();

    // Active Bots HTML
    const activeBotsHTML = piState.bots.length === 0 
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🤖</span>
           <div style="font-weight:700; color: white; font-size: 1rem; margin-bottom: 0.25rem;">Tidak Ada Bot yang Berjalan</div>
           <div style="font-size:0.8rem;">Buat dan deploy bot pertama Anda untuk menghasilkan pasif income secara otomatis.</div>
         </div>`
      : piState.bots.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          const assetData = bot.assetType === 'stock' ? stockMarket.getStock(bot.asset) : cryptoMarket.getCrypto(bot.asset);
          const currentPrice = assetData ? assetData.price : bot.entryPrice;

          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 800; color: white; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                      🤖 ${bot.asset}
                      <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${bot.assetType.toUpperCase()}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${passiveIncomeManager.botStrategies[bot.type].name}</div>
                  </div>
                  <span style="font-size: 0.75rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                  <div>Modal: <span style="color: white; font-weight:600;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L: <span style="color: ${color}; font-weight:700;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                  <div>Entry: <span style="color: white;">$ ${bot.entryPrice.toLocaleString()}</span></div>
                  <div>Harga: <span style="color: white;">$ ${currentPrice.toLocaleString()}</span></div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button onclick="stopTradingBot(${bot.id})" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">
                  Hentikan & Klaim
                </button>
                <button onclick="downloadBotCard(${bot.id}, true)" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; padding: 0 10px; border-color: rgba(255,255,255,0.1);" title="Unduh Kartu Performa">
                  🎴 Unduh
                </button>
              </div>
            </div>
          `;
        }).join('');

    // History Bots HTML
    const historyBotsHTML = (!piState.botHistory || piState.botHistory.length === 0)
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <div style="font-size:0.8rem;">Belum ada riwayat perdagangan bot.</div>
         </div>`
      : piState.botHistory.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          const dateStr = new Date(bot.stopTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = new Date(bot.stopTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 800; color: white; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                      🤖 ${bot.asset}
                      <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${bot.assetType.toUpperCase()}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${dateStr} ${timeStr} • Selesai</div>
                  </div>
                  <span style="font-size: 0.75rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                  <div>Modal: <span style="color: white; font-weight:600;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L: <span style="color: ${color}; font-weight:700;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                  <div>Entry: <span style="color: white;">$ ${bot.entryPrice.toLocaleString()}</span></div>
                  <div>Status: <span style="color: ${color}; font-weight: 600;">${up ? 'Profit' : 'Loss'}</span></div>
                </div>
              </div>
              <button onclick="downloadBotCard(${bot.id}, false)" class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; display: flex; align-items: center; gap: 0.25rem; border-color: rgba(255,255,255,0.1);">
                🎴 Unduh Laporan
              </button>
            </div>
          `;
        }).join('');

    // Active Search filter if any
    const botSearchKeyword = window._botAssetSearchQuery || '';
    const activeAssetTypeTab = window._botAssetTypeTab || 'all';

    let filteredStocks = stockMarket.getAllStocks() || [];
    let filteredCryptos = cryptoMarket.getAllCryptos() || [];

    if (botSearchKeyword) {
      filteredStocks = filteredStocks.filter(s => s.symbol.toLowerCase().includes(botSearchKeyword.toLowerCase()) || s.name.toLowerCase().includes(botSearchKeyword.toLowerCase()));
      filteredCryptos = filteredCryptos.filter(c => c.symbol.toLowerCase().includes(botSearchKeyword.toLowerCase()) || c.name.toLowerCase().includes(botSearchKeyword.toLowerCase()));
    }

    const stockOptions = filteredStocks.map(s => `<option value="stock:${s.symbol}" data-asset-type="stock">📈 Saham: ${s.symbol} - ${s.name}</option>`).join('');
    const cryptoOptions = filteredCryptos.map(c => `<option value="crypto:${c.symbol}" data-asset-type="crypto">🪙 Kripto: ${c.symbol} - ${c.name}</option>`).join('');

    let selectOptionsHTML = '';
    if (activeAssetTypeTab === 'all' || activeAssetTypeTab === 'stock') {
      selectOptionsHTML += `<optgroup label="Saham Terpopuler (Bursa Efek)">${stockOptions || '<option disabled>Tidak ada saham ditemukan</option>'}</optgroup>`;
    }
    if (activeAssetTypeTab === 'all' || activeAssetTypeTab === 'crypto') {
      selectOptionsHTML += `<optgroup label="Aset Kripto (Pasar Kripto)">${cryptoOptions || '<option disabled>Tidak ada kripto ditemukan</option>'}</optgroup>`;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: fade-up 0.3s ease;">
        <!-- Setup Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">🤖 Buat Trading Bot Baru</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Gunakan robot otomatis untuk melakukan trading saham atau aset kripto. Robot Saham beroperasi dengan momentum pasar reguler, sedangkan Robot Kripto menggunakan volatilitas harian 24/7 dengan leverage & return terpisah.</p>
          
          <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
            <!-- Search & Filter Controls for Assets -->
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; align-items: center; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 200px; position: relative;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; opacity: 0.5;">🔍</span>
                <input type="text" id="bot-asset-search" placeholder="Cari aset..." value="${botSearchKeyword}" style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 2rem; background: var(--bg-surface); color: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem;" oninput="window.filterBotAssetSearch(this.value)">
              </div>
              <div style="display: flex; gap: 0.35rem; background: rgba(0,0,0,0.25); padding: 3px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <button class="btn btn-sm" onclick="window.setBotAssetTypeTab('all')" style="font-size: 0.72rem; padding: 4px 8px; border: none; height: auto; font-weight: 700; background: ${activeAssetTypeTab === 'all' ? 'var(--accent-primary-soft)' : 'transparent'}; color: ${activeAssetTypeTab === 'all' ? 'var(--accent-primary)' : 'var(--text-muted)'};">Semua</button>
                <button class="btn btn-sm" onclick="window.setBotAssetTypeTab('stock')" style="font-size: 0.72rem; padding: 4px 8px; border: none; height: auto; font-weight: 700; background: ${activeAssetTypeTab === 'stock' ? 'rgba(55,138,221,0.15)' : 'transparent'}; color: ${activeAssetTypeTab === 'stock' ? '#378add' : 'var(--text-muted)'};">📈 Saham</button>
                <button class="btn btn-sm" onclick="window.setBotAssetTypeTab('crypto')" style="font-size: 0.72rem; padding: 4px 8px; border: none; height: auto; font-weight: 700; background: ${activeAssetTypeTab === 'crypto' ? 'rgba(245,158,11,0.15)' : 'transparent'}; color: ${activeAssetTypeTab === 'crypto' ? '#f59e0b' : 'var(--text-muted)'};">🪙 Kripto</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; min-width: 0;">
              <div class="form-group" style="margin-bottom: 0; min-width: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Pilih Aset Investasi</label>
                <select id="bot-asset-select" class="form-input" style="background: var(--bg-surface); color: white; width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                  ${selectOptionsHTML}
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0; min-width: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Modal Alokasi Bot ($)</label>
                <input type="number" id="bot-capital-input" class="form-input" placeholder="Modal..." value="5000" style="background: var(--bg-surface); color: white; width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end;">
              <button onclick="deploySelectedBot()" class="btn btn-primary btn-sm" style="font-size: 0.75rem; font-weight: 700; height: 32px; display: flex; align-items:center; gap: 0.25rem;">Deploy Bot! 🚀</button>
            </div>
          </div>
        </div>

        <!-- Active Bots Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">⚡ Trading Bot Aktif (${piState.bots.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
            ${activeBotsHTML}
          </div>
        </div>

        <!-- History Bots Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">📜 Riwayat Trading Bot</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
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

    window.buyMiningRig = (type) => {
      try {
        passiveIncomeManager.buyRig(type);
        ui.success(`Rig ${passiveIncomeManager.rigTypes[type].name} berhasil dibeli!`, 'Mining Rig');
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.sellMiningRig = (type) => {
      try {
        passiveIncomeManager.sellRig(type);
        ui.success(`Rig ${passiveIncomeManager.rigTypes[type].name} berhasil dijual!`, 'Mining Rig');
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.stakeCryptoPrompt = async (symbol) => {
      try {
        const wallet = gameState.get('crypto') || {};
        const maxAmt = wallet[symbol] ? wallet[symbol].amount : 0;
        if (maxAmt <= 0) { ui.error('Anda tidak memiliki saldo untuk di-stake'); return; }

        const inputVal = await ui.prompt({
          title: `Stake ${symbol}`,
          message: `Masukkan jumlah ${symbol} yang ingin di-stake (Max: ${maxAmt.toFixed(4)})`,
          placeholder: '0.00',
          defaultValue: maxAmt.toFixed(4),
          isNumeric: true
        });
        if (inputVal) {
          const amt = parseFloat(inputVal);
          if (isNaN(amt) || amt <= 0 || amt > maxAmt) { ui.error('Jumlah input tidak valid'); return; }
          passiveIncomeManager.stake(symbol, amt);
          ui.success(`Berhasil staking ${amt.toFixed(4)} ${symbol}!`, 'Staking Vault');
          notifyView();
        }
      } catch(e) { ui.error(e.message); }
    };

    window.unstakeCryptoPrompt = async (symbol) => {
      try {
        const piState = passiveIncomeManager.getState();
        const maxAmt = piState.staked[symbol] || 0;
        if (maxAmt <= 0) return;

        const inputVal = await ui.prompt({
          title: `Unstake ${symbol}`,
          message: `Masukkan jumlah ${symbol} yang ingin ditarik (Max: ${maxAmt.toFixed(4)})`,
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

    window.deploySelectedBot = () => {
      const assetVal = document.getElementById('bot-asset-select')?.value;
      const capitalInput = document.getElementById('bot-capital-input');
      const capital = capitalInput ? (capitalInput.getNumericValue ? capitalInput.getNumericValue() : parseFloat(capitalInput.value)) : NaN;

      if (!assetVal) { ui.error('Pilih aset terlebih dahulu'); return; }
      if (isNaN(capital) || capital <= 0) { ui.error('Jumlah modal tidak valid'); return; }

      const parts = assetVal.split(':');
      const assetType = parts[0];
      const symbol = parts[1];

      try {
        passiveIncomeManager.startBot('ai', symbol, assetType, capital);
        ui.success(`AI Auto-Trading Bot berhasil dijalankan pada ${symbol}!`, 'Deploy Bot');
        notifyView();
      } catch (e) { ui.error(e.message); }
    };

    window.stopTradingBot = (id) => {
      try {
        passiveIncomeManager.stopBot(id);
        ui.success('Bot dihentikan dan seluruh modal serta profit dikreditkan ke kas!', 'Bot Stopped', { deviceNotify: true });
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.changePassiveView = (view) => {
      if (typeof window._setPassiveView === 'function') {
        window._setPassiveView(view);
      }
      notifyView();
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

    window.claimMiningRewards = () => {
      try {
        passiveIncomeManager.claimMining();
        ui.success('Hasil penambangan Bitcoin berhasil ditambahkan ke wallet!', 'Klaim Mining');
        notifyView();
      } catch(e) { ui.error(e.message); }
    };

    window.commitLaunchdropPrompt = async (id) => {
      try {
        const balance = gameState.getBalance();
        if (balance <= 0) { ui.error('Saldo kas Anda kosong'); return; }

        const amount = await ui.promptMoney({
          title: 'Commit Kas ke Launchdrop',
          maxAmount: balance,
          confirmText: 'Commit'
        });

        if (amount) {
          passiveIncomeManager.commitLaunchdrop(id, amount);
          ui.success(`Berhasil melakukan commit $${amount.toLocaleString()} ke Launchdrop!`, 'Launchdrop');
          notifyView();
        }
      } catch(e) { ui.error(e.message); }
    };

    window.claimLaunchdropReward = (id) => {
      try {
        passiveIncomeManager.claimLaunchdrop(id);
        ui.success('Token hasil Launchdrop berhasil diklaim ke wallet Anda!', 'Klaim Launchdrop', { deviceNotify: true });
        notifyView();
      } catch(e) { ui.error(e.message); }
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
      ctx.fillText(bot.asset, 40, 145);
      
      ctx.font = '600 12px "Outfit", "Inter", "Helvetica Neue", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${bot.assetType.toUpperCase()} • AI Momentum Auto-Trading`, 40, 168);
      
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
      ctx.fillText(`Durasi: ${bot.runtimeTicks || 0} Ticks  |  Waktu: ${timeStr}`, 40, 315);
      
      ctx.textAlign = 'right';
      ctx.fillText('aura-assets.com', 560, 315);
      ctx.textAlign = 'left';
      
      try {
        const link = document.createElement('a');
        link.download = `aura_bot_${bot.asset}_${bot.id.toString().slice(-6)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        ui.success('Kartu performa bot berhasil diunduh!', 'Download Card');
      } catch(err) {
        ui.error('Gagal mengunduh gambar kartu: ' + err.message);
      }
    };

    window.filterBotAssetSearch = (query) => {
      window._botAssetSearchQuery = query;
      notifyView();
      
      const searchInput = document.getElementById('bot-asset-search');
      if (searchInput) {
        searchInput.focus();
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
      }
    };

    window.setBotAssetTypeTab = (tab) => {
      window._botAssetTypeTab = tab;
      notifyView();
    };
}


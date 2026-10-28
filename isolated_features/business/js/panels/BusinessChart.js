/**
 * BusinessChart.js - SVG Corporate Performance Chart Renderer (v2 - Money Flow Edition)
 *
 * Renders two chart sections:
 *   1. Valuation Trend   — yellow area/line (valuation) + green bars (revenue)
 *   2. Money Flow Analysis — green/red grouped bars (revenue vs expenses) + cyan dashed line (net profit)
 *
 * Exports: renderSVGChart(biz, chartType, financeManager, businessManager)
 *          bindChartHoverEvents(container, financeManager)
 */

/**
 * Format number into compact T/B/M notation for chart Y-axis labels.
 */
function formatCompact(num) {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9)  return (num / 1e9).toFixed(2)  + 'B';
    if (num >= 1e6)  return (num / 1e6).toFixed(2)  + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Render a full SVG performance + money flow chart pair.
 *
 * @param {Object} biz             - Current business state object from gameState
 * @param {string} chartType       - (unused, kept for API compat)
 * @param {Object} financeManager  - FinanceManager instance for formatCurrency
 * @param {Object} businessManager - BusinessManager instance for businessTypes
 * @returns {string} HTML string for the complete chart cards
 */
export function renderSVGChart(biz, chartType, financeManager, businessManager) {
    let history = [...(biz.history || [])];

    // Build mock history if insufficient real data
    if (history.length < 2) {
        const setupCost  = businessManager.businessTypes[biz.type]?.setupCost || 50000;
        const currentVal = biz.valuation || setupCost;
        const currentRev = biz.revenue   || 0;
        const currentExp = biz.lastCashFlow?.totalExpense || currentRev * 0.65;
        history = [
            { month: 1, year: 2010, valuation: setupCost,         revenue: 0,               expenses: 0,                netProfit: 0 },
            { month: 2, year: 2010, valuation: currentVal * 0.7,  revenue: currentRev * 0.4, expenses: currentExp * 0.3, netProfit: currentRev * 0.1 },
            { month: 3, year: 2010, valuation: currentVal * 0.9,  revenue: currentRev * 0.7, expenses: currentExp * 0.6, netProfit: currentRev * 0.1 },
            { month: 4, year: 2010, valuation: currentVal,        revenue: currentRev,      expenses: currentExp,       netProfit: currentRev - currentExp }
        ];
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = history.map(h => {
        const rev = h.revenue  || 0;
        // Derive expenses/netProfit for old entries that predate the new fields
        const exp = h.expenses != null ? h.expenses
                  : (h.netProfit != null ? rev - h.netProfit : rev * 0.65);
        const net = h.netProfit != null ? h.netProfit : (rev - exp);
        return {
            label:     `${months[(h.month - 1) % 12]} ${h.year}`,
            valuation: h.valuation || 0,
            revenue:   rev,
            expenses:  exp,
            netProfit: net
        };
    });

    const stepX = data.length > 12 ? 2 : 1;

    // ─────────────────────────────────────────────────────────────
    // CHART 1 — Valuation (line) + Revenue (bars)
    // ─────────────────────────────────────────────────────────────
    const C1 = { w: 800, h: 220, pad: { top: 15, right: 50, bottom: 30, left: 55 } };
    const c1W = C1.w - C1.pad.left - C1.pad.right;
    const c1H = C1.h - C1.pad.top  - C1.pad.bottom;

    const valuations = data.map(d => d.valuation);
    let minVal = Math.min(...valuations);
    let maxVal = Math.max(...valuations);
    if (maxVal === minVal) { minVal = Math.max(0, minVal - 1000); maxVal += 1000; }
    else { const p = (maxVal - minVal) * 0.1; minVal = Math.max(0, minVal - p); maxVal += p; }

    const revenues = data.map(d => d.revenue);
    let minRev = Math.min(...revenues);
    let maxRev = Math.max(...revenues);
    if (maxRev === minRev) { minRev = Math.max(0, minRev - 500); maxRev += 500; }
    else { const p = (maxRev - minRev) * 0.15; minRev = Math.max(0, minRev - p); maxRev += p; }

    const c1X    = i   => C1.pad.left + i * (c1W / (data.length - 1 || 1));
    const c1YVal = val => C1.pad.top + c1H - ((val - minVal) / (maxVal - minVal || 1) * c1H);
    const c1YRev = rev => C1.pad.top + c1H - ((rev - minRev) / (maxRev - minRev || 1) * c1H);

    // Left Y axis (Valuation — amber)
    let c1Grid = '';
    for (let i = 0; i <= 4; i++) {
        const val = minVal + i * (maxVal - minVal) / 4;
        const y   = C1.pad.top + c1H - i * c1H / 4;
        c1Grid += `
            <line x1="${C1.pad.left}" y1="${y}" x2="${C1.w - C1.pad.right}" y2="${y}"
                  stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3 3"/>
            <text x="${C1.pad.left - 8}" y="${y + 4}" fill="#fbbf24"
                  font-size="9" font-weight="700" text-anchor="end">$ ${formatCompact(val)}</text>
        `;
    }

    // Right Y axis (Revenue — green)
    let c1RightAxis = '';
    for (let i = 0; i <= 4; i++) {
        const rev = minRev + i * (maxRev - minRev) / 4;
        const y   = C1.pad.top + c1H - i * c1H / 4;
        c1RightAxis += `
            <text x="${C1.w - C1.pad.right + 8}" y="${y + 4}" fill="#10b981"
                  font-size="9" font-weight="700" text-anchor="start">$ ${formatCompact(rev)}</text>
        `;
    }

    // Revenue bars
    const barW1 = Math.max(8, Math.min(20, c1W / (data.length * 2.5)));
    let c1Bars = '';
    data.forEach((d, i) => {
        const x = c1X(i) - barW1 / 2;
        const y = c1YRev(d.revenue);
        const h = C1.pad.top + c1H - y;
        c1Bars += `<rect x="${x}" y="${y}" width="${barW1}" height="${Math.max(0, h)}"
                         fill="rgba(16,185,129,0.18)" stroke="#10b981" stroke-width="1" rx="2"/>`;
    });

    // Valuation area + line
    let c1Points = '';
    data.forEach((d, i) => { c1Points += `${c1X(i)},${c1YVal(d.valuation)} `; });
    const c1LinePath = `M ${c1Points}`;
    const c1AreaPath = `${c1LinePath} L ${c1X(data.length - 1)},${C1.pad.top + c1H} L ${c1X(0)},${C1.pad.top + c1H} Z`;

    // Dots
    const c1Dots = data.map((d, i) => `
        <circle cx="${c1X(i)}" cy="${c1YVal(d.valuation)}" r="4.5"
                fill="#18181b" stroke="#f59e0b" stroke-width="2" class="chart-dot chart-dot-${i}"/>`).join('');

    // X labels
    let c1XLabels = '';
    data.forEach((d, i) => {
        if (i % stepX === 0 || i === data.length - 1) {
            c1XLabels += `
                <text x="${c1X(i)}" y="${C1.h - 10}" fill="rgba(255,255,255,0.4)"
                      font-size="10" font-weight="600" text-anchor="middle">${d.label}</text>
                <line x1="${c1X(i)}" y1="${C1.pad.top + c1H}" x2="${c1X(i)}" y2="${C1.pad.top + c1H + 4}"
                      stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            `;
        }
    });

    // Hover triggers (chart 1)
    const tW1 = c1W / data.length;
    let c1Hover = '';
    data.forEach((d, i) => {
        c1Hover += `
            <g class="chart-hover-trigger"
               data-index="${i}" data-label="${d.label}"
               data-valuation="${d.valuation}" data-revenue="${d.revenue}"
               data-expenses="${d.expenses}" data-netprofit="${d.netProfit}"
               data-x="${c1X(i)}" data-y="${c1YVal(d.valuation)}">
                <rect x="${c1X(i) - tW1 / 2}" y="${C1.pad.top}" width="${tW1}" height="${c1H}"
                      fill="transparent" style="cursor:crosshair;"/>
            </g>
        `;
    });

    // ─────────────────────────────────────────────────────────────
    // CHART 2 — Money Flow: Revenue vs Expenses (grouped bars) + Net Profit line
    // ─────────────────────────────────────────────────────────────
    const C2 = { w: 800, h: 210, pad: { top: 20, right: 60, bottom: 30, left: 60 } };
    const c2W = C2.w - C2.pad.left - C2.pad.right;
    const c2H = C2.h - C2.pad.top  - C2.pad.bottom;

    // Y-axis range must accommodate revenue, expenses AND net profit (can be negative)
    const allAmounts = data.flatMap(d => [d.revenue, d.expenses]);
    const allNets    = data.map(d => d.netProfit);
    let c2Min = Math.min(0, ...allNets);
    let c2Max = Math.max(...allAmounts, 1);
    const c2Pad = (c2Max - c2Min) * 0.1;
    c2Min -= c2Pad;
    c2Max += c2Pad;

    const c2X    = i   => C2.pad.left + i * (c2W / (data.length - 1 || 1));
    const c2Y    = val => C2.pad.top  + c2H - ((val - c2Min) / (c2Max - c2Min || 1) * c2H);
    const zeroY  = c2Y(0);

    // Y axis + grid
    let c2YAxis = '';
    const c2Steps = 5;
    for (let i = 0; i <= c2Steps; i++) {
        const val = c2Min + i * (c2Max - c2Min) / c2Steps;
        const y   = C2.pad.top + c2H - i * c2H / c2Steps;
        c2YAxis += `
            <line x1="${C2.pad.left}" y1="${y}" x2="${C2.w - C2.pad.right}" y2="${y}"
                  stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="3 3"/>
            <text x="${C2.pad.left - 8}" y="${y + 4}" fill="rgba(255,255,255,0.45)"
                  font-size="9" font-weight="700" text-anchor="end">$ ${formatCompact(val)}</text>
        `;
    }

    // Zero line
    const zeroLine = `
        <line x1="${C2.pad.left}" y1="${zeroY}" x2="${C2.w - C2.pad.right}" y2="${zeroY}"
              stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-dasharray="4 3"/>
        <text x="${C2.pad.left - 8}" y="${zeroY + 4}" fill="rgba(255,255,255,0.3)"
              font-size="8" text-anchor="end">0</text>
    `;

    // Grouped bars (revenue left, expenses right of each X tick)
    const groupW = Math.max(8, Math.min(24, c2W / (data.length * 3)));
    let c2Bars = '';
    data.forEach((d, i) => {
        const cx = c2X(i);
        // Revenue (green, left)
        const revY = c2Y(d.revenue);
        const revH = Math.max(0, zeroY - revY);
        // Expenses (red, right)
        const expY = c2Y(d.expenses);
        const expH = Math.max(0, zeroY - expY);
        c2Bars += `
            <rect x="${cx - groupW - 1}" y="${revY}" width="${groupW}" height="${revH}"
                  fill="rgba(16,185,129,0.25)" stroke="#10b981" stroke-width="1.5" rx="2"/>
            <rect x="${cx + 1}" y="${expY}" width="${groupW}" height="${expH}"
                  fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="1.5" rx="2"/>
        `;
    });

    // Net profit line
    let c2NetPoints = '';
    data.forEach((d, i) => { c2NetPoints += `${c2X(i)},${c2Y(d.netProfit)} `; });
    const c2NetPath = `M ${c2NetPoints}`;

    // Net profit dots
    const c2Dots = data.map((d, i) => {
        const col = d.netProfit >= 0 ? '#22d3ee' : '#f87171';
        return `<circle cx="${c2X(i)}" cy="${c2Y(d.netProfit)}" r="4"
                        fill="#18181b" stroke="${col}" stroke-width="2"/>`;
    }).join('');

    // X labels
    let c2XLabels = '';
    data.forEach((d, i) => {
        if (i % stepX === 0 || i === data.length - 1) {
            c2XLabels += `
                <text x="${c2X(i)}" y="${C2.h - 10}" fill="rgba(255,255,255,0.4)"
                      font-size="10" font-weight="600" text-anchor="middle">${d.label}</text>
            `;
        }
    });

    // Hover triggers (chart 2)
    const tW2 = c2W / data.length;
    let c2Hover = '';
    data.forEach((d, i) => {
        c2Hover += `
            <g class="cf2-hover-trigger"
               data-index="${i}" data-label="${d.label}"
               data-revenue="${d.revenue}" data-expenses="${d.expenses}"
               data-netprofit="${d.netProfit}"
               data-x="${c2X(i)}" data-y="${c2Y(d.netProfit)}">
                <rect x="${c2X(i) - tW2 / 2}" y="${C2.pad.top}" width="${tW2}" height="${c2H}"
                      fill="transparent" style="cursor:crosshair;"/>
            </g>
        `;
    });

    // ─────────────────────────────────────────────────────────────
    // HTML OUTPUT
    // ─────────────────────────────────────────────────────────────
    return `
        <!-- CHART 1: Valuation Trend + Revenue Bars -->
        <div class="card" style="padding:1.5rem; margin-bottom:1.25rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.01); position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                <h3 style="margin:0; font-size:1.1rem; font-weight:900; display:flex; align-items:center; gap:0.5rem; color:#fff;">
                    <span>📈</span> Tren Valuasi Korporasi
                </h3>
                <div style="display:flex; gap:0.8rem; background:rgba(0,0,0,0.2); padding:6px 12px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; font-weight:700;">
                    <span style="display:flex; align-items:center; gap:4px; color:#fbbf24;">
                        <span style="display:inline-block; width:10px; height:3px; background:#fbbf24; border-radius:2px;"></span>
                        Valuasi (Kiri)
                    </span>
                    <span style="display:flex; align-items:center; gap:4px; color:#10b981;">
                        <span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:2px; opacity:0.7;"></span>
                        Revenue (Kanan)
                    </span>
                </div>
            </div>
            <div class="svg-chart-container" style="position:relative; width:100%; overflow:hidden;">
                <svg viewBox="0 0 ${C1.w} ${C1.h}" style="width:100%; height:auto; overflow:visible;">
                    <defs>
                        <linearGradient id="grad-val-hybrid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stop-color="rgba(245,158,11,0.22)"/>
                            <stop offset="100%" stop-color="rgba(245,158,11,0)"/>
                        </linearGradient>
                    </defs>
                    ${c1Grid}
                    ${c1RightAxis}
                    ${c1Bars}
                    <path d="${c1AreaPath}" fill="url(#grad-val-hybrid)"/>
                    <path d="${c1LinePath}" fill="none" stroke="#f59e0b" stroke-width="2.5"
                          stroke-linejoin="round" stroke-linecap="round"/>
                    ${c1Dots}
                    ${c1XLabels}
                    <line id="chart-hover-line" x1="0" y1="${C1.pad.top}" x2="0" y2="${C1.pad.top + c1H}"
                          stroke="rgba(255,255,255,0.22)" stroke-width="1.5" stroke-dasharray="3 3" style="display:none;"/>
                    <circle id="chart-hover-circle" cx="0" cy="0" r="6"
                            fill="#f59e0b" stroke="#fff" stroke-width="2" style="display:none;"/>
                    ${c1Hover}
                </svg>
                <div id="biz-chart-tooltip" style="
                    position:absolute; display:none; pointer-events:none;
                    background:rgba(9,9,11,0.96); border:1px solid rgba(255,255,255,0.1);
                    padding:9px 13px; border-radius:10px; font-size:11px; z-index:10;
                    backdrop-filter:blur(10px); box-shadow:0 10px 24px rgba(0,0,0,0.55);
                    color:white; width:185px; font-family:inherit;
                "></div>
            </div>
        </div>

        <!-- CHART 2: Money Flow — Revenue vs Expenses + Net Profit line -->
        <div class="card" style="padding:1.5rem; margin-bottom:2rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.01); position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                <h3 style="margin:0; font-size:1.1rem; font-weight:900; display:flex; align-items:center; gap:0.5rem; color:#fff;">
                    <span>💰</span> Analisis Arus Kas Bulanan <span style="font-size:0.7rem; font-weight:600; color:var(--text-muted); margin-left:4px;">(Money Flow)</span>
                </h3>
                <div style="display:flex; gap:0.8rem; background:rgba(0,0,0,0.2); padding:6px 12px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; font-weight:700;">
                    <span style="display:flex; align-items:center; gap:4px; color:#10b981;">
                        <span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:2px; opacity:0.7;"></span>
                        Pemasukan
                    </span>
                    <span style="display:flex; align-items:center; gap:4px; color:#ef4444;">
                        <span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:2px; opacity:0.7;"></span>
                        Pengeluaran
                    </span>
                    <span style="display:flex; align-items:center; gap:4px; color:#22d3ee;">
                        <span style="display:inline-block; width:22px; height:2px; background:#22d3ee; border-radius:2px; margin-bottom:1px;"></span>
                        Laba Bersih
                    </span>
                </div>
            </div>
            <div class="svg-chart-container cf2-chart-container" style="position:relative; width:100%; overflow:hidden;">
                <svg viewBox="0 0 ${C2.w} ${C2.h}" style="width:100%; height:auto; overflow:visible;">
                    ${c2YAxis}
                    ${zeroLine}
                    ${c2Bars}
                    <path d="${c2NetPath}" fill="none" stroke="#22d3ee" stroke-width="2"
                          stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="6 2"/>
                    ${c2Dots}
                    ${c2XLabels}
                    <line id="cf2-hover-line" x1="0" y1="${C2.pad.top}" x2="0" y2="${C2.pad.top + c2H}"
                          stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="3 3" style="display:none;"/>
                    ${c2Hover}
                </svg>
                <div id="cf2-chart-tooltip" style="
                    position:absolute; display:none; pointer-events:none;
                    background:rgba(9,9,11,0.97); border:1px solid rgba(255,255,255,0.12);
                    padding:10px 14px; border-radius:10px; font-size:11px; z-index:10;
                    backdrop-filter:blur(12px); box-shadow:0 10px 28px rgba(0,0,0,0.65);
                    color:white; width:205px; font-family:inherit;
                "></div>
            </div>
        </div>
    `;
}


/**
 * Bind hover tooltip events for both SVG charts.
 * Must be called after chart HTML is inserted into the DOM.
 *
 * @param {HTMLElement} container - Parent container of the charts
 * @param {Object} financeManager - FinanceManager instance
 */
export function bindChartHoverEvents(container, financeManager) {
    const fmt = v => financeManager.formatCurrency(v);

    // ── Chart 1 hover ──
    const tooltip1     = container.querySelector('#biz-chart-tooltip');
    const hoverLine1   = container.querySelector('#chart-hover-line');
    const hoverCircle1 = container.querySelector('#chart-hover-circle');

    container.querySelectorAll('.chart-hover-trigger').forEach(trigger => {
        trigger.addEventListener('mousemove', () => {
            const x      = parseFloat(trigger.dataset.x);
            const y      = parseFloat(trigger.dataset.y);
            const rawVal = parseFloat(trigger.dataset.valuation);
            const rawRev = parseFloat(trigger.dataset.revenue);
            const rawExp = parseFloat(trigger.dataset.expenses);
            const rawNet = parseFloat(trigger.dataset.netprofit);
            const label  = trigger.dataset.label;
            const netCol = rawNet >= 0 ? '#10b981' : '#ef4444';

            if (hoverLine1)   { hoverLine1.setAttribute('x1', x); hoverLine1.setAttribute('x2', x); hoverLine1.style.display = 'block'; }
            if (hoverCircle1) { hoverCircle1.setAttribute('cx', x); hoverCircle1.setAttribute('cy', y); hoverCircle1.style.display = 'block'; }

            if (tooltip1) {
                tooltip1.style.display = 'block';
                const pct = (x / 800) * 100;
                tooltip1.style.left = `calc(${pct}% + ${pct > 50 ? '-200px' : '15px'})`;
                tooltip1.style.top  = '30px';
                tooltip1.innerHTML = `
                    <div style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; margin-bottom:6px;">${label}</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span style="color:rgba(255,255,255,0.5);">Valuasi</span>
                        <span style="font-weight:700; color:#fbbf24;">$ ${fmt(rawVal)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span style="color:rgba(255,255,255,0.5);">Revenue</span>
                        <span style="font-weight:700; color:#10b981;">+$ ${fmt(rawRev)}</span>
                    </div>
                    ${!isNaN(rawExp) && rawExp > 0 ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span style="color:rgba(255,255,255,0.5);">Pengeluaran</span>
                        <span style="font-weight:700; color:#ef4444;">-$ ${fmt(rawExp)}</span>
                    </div>` : ''}
                    ${!isNaN(rawNet) ? `
                    <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.08); padding-top:4px; margin-top:3px;">
                        <span style="color:rgba(255,255,255,0.5);">Laba Bersih</span>
                        <span style="font-weight:800; color:${netCol};">${rawNet >= 0 ? '+' : ''}$ ${fmt(rawNet)}</span>
                    </div>` : ''}
                `;
            }
        });
        trigger.addEventListener('mouseleave', () => {
            if (hoverLine1)   hoverLine1.style.display   = 'none';
            if (hoverCircle1) hoverCircle1.style.display = 'none';
            if (tooltip1)     tooltip1.style.display     = 'none';
        });
    });

    // ── Chart 2 hover ──
    const tooltip2   = container.querySelector('#cf2-chart-tooltip');
    const hoverLine2 = container.querySelector('#cf2-hover-line');

    container.querySelectorAll('.cf2-hover-trigger').forEach(trigger => {
        trigger.addEventListener('mousemove', () => {
            const x      = parseFloat(trigger.dataset.x);
            const rawRev = parseFloat(trigger.dataset.revenue);
            const rawExp = parseFloat(trigger.dataset.expenses);
            const rawNet = parseFloat(trigger.dataset.netprofit);
            const label  = trigger.dataset.label;
            const netCol = rawNet >= 0 ? '#22d3ee' : '#f87171';
            const margin = rawRev > 0 ? ((rawNet / rawRev) * 100).toFixed(1) : '0';

            if (hoverLine2) { hoverLine2.setAttribute('x1', x); hoverLine2.setAttribute('x2', x); hoverLine2.style.display = 'block'; }

            if (tooltip2) {
                tooltip2.style.display = 'block';
                const pct = (x / 800) * 100;
                tooltip2.style.left = `calc(${pct}% + ${pct > 50 ? '-220px' : '15px'})`;
                tooltip2.style.top  = '30px';
                tooltip2.innerHTML = `
                    <div style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:5px; margin-bottom:6px;">${label}</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="color:rgba(255,255,255,0.5);">🟢 Pemasukan</span>
                        <span style="font-weight:700; color:#10b981;">+$ ${fmt(rawRev)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="color:rgba(255,255,255,0.5);">🔴 Pengeluaran</span>
                        <span style="font-weight:700; color:#ef4444;">-$ ${fmt(rawExp)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px; margin-top:2px;">
                        <span style="color:rgba(255,255,255,0.5);">📊 Laba Bersih</span>
                        <span style="font-weight:800; color:${netCol};">${rawNet >= 0 ? '+' : ''}$ ${fmt(rawNet)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:3px;">
                        <span style="color:rgba(255,255,255,0.4); font-size:10px;">Profit Margin</span>
                        <span style="font-weight:700; color:${netCol}; font-size:10px;">${margin}%</span>
                    </div>
                `;
            }
        });
        trigger.addEventListener('mouseleave', () => {
            if (hoverLine2) hoverLine2.style.display = 'none';
            if (tooltip2)   tooltip2.style.display   = 'none';
        });
    });
}

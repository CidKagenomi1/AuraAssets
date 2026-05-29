/**
 * BusinessChart.js - SVG Corporate Performance Chart Renderer
 *
 * Extracted from BusinessPage.js to keep chart rendering logic separate
 * and improve editability when tweaking chart visuals.
 *
 * Exports: renderSVGChart(biz, chartType, container, financeManager, businessManager)
 */

/**
 * Format number into compact T/B/M notation for chart Y-axis labels.
 */
function formatCompact(num) {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9)  return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6)  return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Render a full SVG performance chart card for a business.
 *
 * @param {Object} biz - Current business state object from gameState
 * @param {string} chartType - 'valuation' | 'revenue'
 * @param {Object} financeManager - FinanceManager instance for formatCurrency
 * @param {Object} businessManager - BusinessManager instance for businessTypes
 * @returns {string} HTML string for the complete chart card
 */
export function renderSVGChart(biz, chartType, financeManager, businessManager) {
    let history = [...(biz.history || [])];
    const brandColor = biz.type === 'startup' ? '#818cf8' : 'var(--accent-primary)';

    // If history is empty, generate mock history starting from setup cost
    if (history.length < 2) {
        const setupCost = businessManager.businessTypes[biz.type]?.setupCost || 50000;
        const currentVal = biz.valuation || setupCost;
        const currentRev = biz.revenue || 0;
        history = [
            { month: 1, year: 2010, valuation: setupCost,         revenue: 0 },
            { month: 2, year: 2010, valuation: currentVal * 0.7,  revenue: currentRev * 0.5 },
            { month: 3, year: 2010, valuation: currentVal * 0.9,  revenue: currentRev * 0.8 },
            { month: 4, year: 2010, valuation: currentVal,        revenue: currentRev }
        ];
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = history.map(h => ({
        label:        `${months[(h.month - 1) % 12]} ${h.year}`,
        valuation:    h.valuation || 0,
        revenue:      h.revenue || 0
    }));

    // Find min and max for both axes
    const valuations = data.map(d => d.valuation);
    const revenues = data.map(d => d.revenue);

    let minVal = Math.min(...valuations);
    let maxVal = Math.max(...valuations);
    if (maxVal === minVal) {
        minVal = Math.max(0, minVal - 1000);
        maxVal = maxVal + 1000;
    } else {
        const padVal = (maxVal - minVal) * 0.1;
        minVal = Math.max(0, minVal - padVal);
        maxVal = maxVal + padVal;
    }

    let minRev = Math.min(...revenues);
    let maxRev = Math.max(...revenues);
    if (maxRev === minRev) {
        minRev = Math.max(0, minRev - 500);
        maxRev = maxRev + 500;
    } else {
        const padRev = (maxRev - minRev) * 0.15;
        minRev = Math.max(0, minRev - padRev);
        maxRev = maxRev + padRev;
    }

    const width   = 800;
    const height  = 220;
    const padding = { top: 20, right: 80, bottom: 35, left: 80 };
    const chartW  = width  - padding.left - padding.right;
    const chartH  = height - padding.top  - padding.bottom;

    const getX = (i)   => padding.left + i * (chartW / (data.length - 1 || 1));
    const getYVal = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal || 1) * chartH);
    const getYRev = (rev) => padding.top + chartH - ((rev - minRev) / (maxRev - minRev || 1) * chartH);

    // Left Y-axis (Valuation) & Grid Lines
    let leftGridHtml = '';
    for (let i = 0; i <= 4; i++) {
        const val = minVal + (i * (maxVal - minVal) / 4);
        const y   = padding.top + chartH - (i * chartH / 4);
        leftGridHtml += `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"
                  stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3 3" />
            <text x="${padding.left - 10}" y="${y + 4}" fill="#fbbf24"
                  font-size="9px" font-weight="700" text-anchor="end">$ ${formatCompact(val)}</text>
        `;
    }

    // Right Y-axis (Revenue)
    let rightYAxisHtml = '';
    for (let i = 0; i <= 4; i++) {
        const rev = minRev + (i * (maxRev - minRev) / 4);
        const y   = padding.top + chartH - (i * chartH / 4);
        rightYAxisHtml += `
            <text x="${width - padding.right + 10}" y="${y + 4}" fill="#3b82f6"
                  font-size="9px" font-weight="700" text-anchor="start">$ ${formatCompact(rev)}</text>
        `;
    }

    // Polyline points for Valuation
    let points = '';
    data.forEach((d, i) => { points += `${getX(i)},${getYVal(d.valuation)} `; });

    const linePath  = `M ${points}`;
    const areaPath  = `${linePath} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

    // Bars for Revenue
    let revenueBarsHtml = '';
    const barW = Math.max(8, Math.min(24, chartW / (data.length * 2.5)));
    data.forEach((d, i) => {
        const x = getX(i) - barW / 2;
        const y = getYRev(d.revenue);
        const h = padding.top + chartH - y;
        revenueBarsHtml += `
            <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, h)}"
                  fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="1" rx="2" />
        `;
    });

    // X-axis labels
    let xLabelsHtml = '';
    const stepX = data.length > 12 ? 2 : 1;
    data.forEach((d, i) => {
        if (i % stepX === 0 || i === data.length - 1) {
            xLabelsHtml += `
                <text x="${getX(i)}" y="${height - 10}" fill="rgba(255,255,255,0.4)"
                      font-size="10px" font-weight="600" text-anchor="middle">${d.label}</text>
                <line x1="${getX(i)}" y1="${padding.top + chartH}" x2="${getX(i)}" y2="${padding.top + chartH + 4}"
                      stroke="rgba(255,255,255,0.15)" stroke-width="1" />
            `;
        }
    });

    // Hover triggers
    let hoverBarsHtml = '';
    const triggerWidth = chartW / data.length;
    data.forEach((d, i) => {
        const xLeft   = getX(i) - triggerWidth / 2;
        const xCenter = getX(i);
        const yVal    = getYVal(d.valuation);
        hoverBarsHtml += `
            <g class="chart-hover-trigger" data-index="${i}" data-label="${d.label}"
               data-val="${d.valuation}" data-valuation="${d.valuation}"
               data-revenue="${d.revenue}" data-x="${xCenter}" data-y="${yVal}">
                <rect x="${xLeft}" y="${padding.top}" width="${triggerWidth}" height="${chartH}"
                      fill="transparent" style="cursor:crosshair;" />
            </g>
        `;
    });

    return `
        <div class="card" style="padding: 1.5rem; margin-bottom: 2rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                <h3 style="margin:0; font-size: 1.15rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color: #fff;">
                    <span>📈</span> Grafik Tren Kinerja Korporasi
                </h3>
                <div style="display:flex; gap:0.8rem; background:rgba(0,0,0,0.2); padding:6px 12px; border-radius:8px; border:1px solid var(--border-color); font-size: 0.75rem; font-weight: 700;">
                    <span style="display:flex; align-items:center; gap:4px; color:#fbbf24;">
                        <span style="display:inline-block; width:10px; height:10px; background:#fbbf24; border-radius:2px;"></span>
                        Valuasi (Garis - Kiri)
                    </span>
                    <span style="display:flex; align-items:center; gap:4px; color:#3b82f6;">
                        <span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:2px;"></span>
                        Revenue (Batang - Kanan)
                    </span>
                </div>
            </div>

            <div class="svg-chart-container" style="position:relative; width:100%; overflow:hidden;">
                <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
                    <defs>
                        <linearGradient id="grad-val-hybrid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="rgba(245, 158, 11, 0.2)" />
                            <stop offset="100%" stop-color="rgba(245, 158, 11, 0.0)" />
                        </linearGradient>
                    </defs>

                    ${leftGridHtml}
                    ${rightYAxisHtml}

                    <!-- Revenue Bars -->
                    ${revenueBarsHtml}

                    <!-- Area Fill -->
                    <path d="${areaPath}" fill="url(#grad-val-hybrid)" />

                    <!-- Line Path -->
                    <path d="${linePath}" fill="none" stroke="#f59e0b" stroke-width="2.5"
                          stroke-linejoin="round" stroke-linecap="round" />

                    <!-- Dots -->
                    ${data.map((d, i) => `
                        <circle cx="${getX(i)}" cy="${getYVal(d.valuation)}" r="4.5" fill="#18181b"
                                stroke="#f59e0b" stroke-width="2" class="chart-dot chart-dot-${i}" />
                    `).join('')}

                    ${xLabelsHtml}

                    <!-- Hover guides -->
                    <line id="chart-hover-line" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + chartH}"
                          stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="3 3" style="display:none;" />
                    <circle id="chart-hover-circle" cx="0" cy="0" r="6"
                            fill="#f59e0b" stroke="#fff" stroke-width="2" style="display:none;" />

                    ${hoverBarsHtml}
                </svg>

                <!-- Floating Tooltip Card -->
                <div id="biz-chart-tooltip" style="
                    position: absolute; display: none; pointer-events: none;
                    background: rgba(9, 9, 11, 0.95); border: 1px solid rgba(255,255,255,0.1);
                    padding: 8px 12px; border-radius: 8px; font-size: 11px; z-index: 10;
                    backdrop-filter: blur(8px); box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                    color: white; width: 170px; font-family:inherit;
                "></div>
            </div>
        </div>
    `;
}

/**
 * Bind hover tooltip events for the SVG chart.
 * Should be called after chart HTML is inserted into the DOM.
 *
 * @param {HTMLElement} container - Parent container of the chart
 * @param {Object} financeManager - FinanceManager instance
 */
export function bindChartHoverEvents(container, financeManager) {
    const tooltip      = container.querySelector('#biz-chart-tooltip');
    const hoverLine    = container.querySelector('#chart-hover-line');
    const hoverCircle  = container.querySelector('#chart-hover-circle');
    const chartContainer = container.querySelector('.svg-chart-container');

    if (!chartContainer) return;

    container.querySelectorAll('.chart-hover-trigger').forEach(trigger => {
        trigger.addEventListener('mousemove', () => {
            const x      = parseFloat(trigger.dataset.x);
            const y      = parseFloat(trigger.dataset.y);
            const rawVal = parseFloat(trigger.dataset.valuation);
            const rawRev = parseFloat(trigger.dataset.revenue);
            const label  = trigger.dataset.label;

            if (hoverLine)   { hoverLine.setAttribute('x1', x); hoverLine.setAttribute('x2', x); hoverLine.style.display = 'block'; }
            if (hoverCircle) { hoverCircle.setAttribute('cx', x); hoverCircle.setAttribute('cy', y); hoverCircle.style.display = 'block'; }

            if (tooltip) {
                tooltip.style.display = 'block';
                const percentX = (x / 800) * 100;
                tooltip.style.left = `calc(${percentX}% + ${percentX > 50 ? '-190px' : '15px'})`;
                tooltip.style.top  = '40px';
                tooltip.innerHTML = `
                    <div style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; margin-bottom:4px; color:#fff;">${label}</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span style="color:var(--text-muted);">Valuasi:</span>
                        <span style="font-weight:700; color:#fbbf24;">$ ${financeManager.formatCurrency(rawVal)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">Revenue:</span>
                        <span style="font-weight:700; color:#3b82f6;">$ ${financeManager.formatCurrency(rawRev)}</span>
                    </div>
                `;
            }
        });

        trigger.addEventListener('mouseleave', () => {
            if (hoverLine)   hoverLine.style.display   = 'none';
            if (hoverCircle) hoverCircle.style.display = 'none';
            if (tooltip)     tooltip.style.display     = 'none';
        });
    });
}

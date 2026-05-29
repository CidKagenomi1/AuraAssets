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
    const isValuation = chartType === 'valuation';
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
        value:        isValuation ? (h.valuation || 0) : (h.revenue || 0),
        rawValuation: h.valuation || 0,
        rawRevenue:   h.revenue || 0
    }));

    const values = data.map(d => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (maxVal === minVal) {
        minVal = Math.max(0, minVal - 1000);
        maxVal = maxVal + 1000;
    } else {
        const pad = (maxVal - minVal) * 0.1;
        minVal = Math.max(0, minVal - pad);
        maxVal = maxVal + pad;
    }

    const width   = 800;
    const height  = 220;
    const padding = { top: 15, right: 80, bottom: 35, left: 80 };
    const chartW  = width  - padding.left - padding.right;
    const chartH  = height - padding.top  - padding.bottom;

    const getX = (i)   => padding.left + i * (chartW / (data.length - 1 || 1));
    const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal || 1) * chartH);

    // Grid lines
    let gridHtml = '';
    for (let i = 0; i <= 4; i++) {
        const val = minVal + (i * (maxVal - minVal) / 4);
        const y   = padding.top + chartH - (i * chartH / 4);
        gridHtml += `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"
                  stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3 3" />
            <text x="${padding.left - 10}" y="${y + 4}" fill="rgba(255,255,255,0.4)"
                  font-size="10px" font-weight="600" text-anchor="end">$ ${formatCompact(val)}</text>
        `;
    }

    // Polyline points
    let points = '';
    data.forEach((d, i) => { points += `${getX(i)},${getY(d.value)} `; });

    const linePath  = `M ${points}`;
    const areaPath  = `${linePath} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;
    const strokeColor  = isValuation ? '#f59e0b' : '#3b82f6';
    const gradId       = isValuation ? 'grad-val' : 'grad-rev';
    const gradColors   = isValuation
        ? ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.01)']
        : ['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.01)'];

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
    const barWidth = chartW / data.length;
    data.forEach((d, i) => {
        const xLeft   = getX(i) - barWidth / 2;
        const xCenter = getX(i);
        const yVal    = getY(d.value);
        hoverBarsHtml += `
            <g class="chart-hover-trigger" data-index="${i}" data-label="${d.label}"
               data-val="${d.value}" data-valuation="${d.rawValuation}"
               data-revenue="${d.rawRevenue}" data-x="${xCenter}" data-y="${yVal}">
                <rect x="${xLeft}" y="${padding.top}" width="${barWidth}" height="${chartH}"
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
                <div style="display:flex; gap:0.35rem; background:rgba(0,0,0,0.2); padding:3px; border-radius:8px; border:1px solid var(--border-color);">
                    <button class="btn-chart-toggle ${isValuation ? 'active' : ''}" data-type="valuation"
                            style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; border:none; cursor:pointer; transition:all 0.2s; font-family:inherit;">Valuasi</button>
                    <button class="btn-chart-toggle ${!isValuation ? 'active' : ''}" data-type="revenue"
                            style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; border:none; cursor:pointer; transition:all 0.2s; font-family:inherit;">Revenue</button>
                </div>
            </div>

            <div class="svg-chart-container" style="position:relative; width:100%; overflow:hidden;">
                <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
                    <defs>
                        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${gradColors[0]}" />
                            <stop offset="100%" stop-color="${gradColors[1]}" />
                        </linearGradient>
                    </defs>

                    ${gridHtml}

                    <!-- Area Fill -->
                    <path d="${areaPath}" fill="url(#${gradId})" />

                    <!-- Line Path -->
                    <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2.5"
                          stroke-linejoin="round" stroke-linecap="round" />

                    <!-- Dots -->
                    ${data.map((d, i) => `
                        <circle cx="${getX(i)}" cy="${getY(d.value)}" r="4.5" fill="#18181b"
                                stroke="${strokeColor}" stroke-width="2" class="chart-dot chart-dot-${i}" />
                    `).join('')}

                    ${xLabelsHtml}

                    <!-- Hover guides -->
                    <line id="chart-hover-line" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + chartH}"
                          stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="3 3" style="display:none;" />
                    <circle id="chart-hover-circle" cx="0" cy="0" r="6"
                            fill="${strokeColor}" stroke="#fff" stroke-width="2" style="display:none;" />

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

            <style>
                .btn-chart-toggle {
                    background: transparent;
                    color: var(--text-muted);
                }
                .btn-chart-toggle.active {
                    background: ${brandColor};
                    color: ${biz.type === 'startup' ? '#fff' : '#000'} !important;
                }
            </style>
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

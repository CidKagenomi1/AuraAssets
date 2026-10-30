/**
 * ChartEngine.js - High-Performance Interactive Trading Chart Powered by Plotly.js
 * Features:
 *  - Rock-solid stability: zero flickering, debounced resizing & async re-entrancy protection
 *  - Line Chart (smooth gradient area) & Candlestick Chart (OHLC)
 *  - Instant Line/Candle switching
 *  - Touch & Hover interactive crosshair & price marker
 *  - Optional Volume indicator (subtle translucent volume bars pinned at bottom 25%)
 *  - Dynamic container height adaptation (mobile, compact, and full desktop)
 */

async function getPlotly() {
    if (typeof window !== 'undefined' && window.Plotly) {
        return window.Plotly;
    }
    if (typeof window !== 'undefined' && window._plotlyLoadingPromise) {
        return window._plotlyLoadingPromise;
    }
    if (typeof window !== 'undefined') {
        window._plotlyLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
            script.charset = 'utf-8';
            script.async = true;
            script.onload = () => {
                window._plotlyLoadingPromise = null;
                resolve(window.Plotly);
            };
            script.onerror = () => {
                window._plotlyLoadingPromise = null;
                import('plotly.js-dist-min')
                    .then(m => resolve(m.default || m))
                    .catch(reject);
            };
            document.head.appendChild(script);
        });
        return window._plotlyLoadingPromise;
    }
    const m = await import('plotly.js-dist-min');
    return m.default || m;
}

class ChartEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.chartType = 'line'; // 'line' or 'candlestick'
        this.showVolume = false; // Volume indicator is optional (default off for clean view)
        this.data = [];
        this.plotly = null;
        this._initialized = false;
        this._isRendering = false;
        this._pendingRender = false;
        this._eventsBound = false;
        this._resizeObserver = null;
        this._windowResizeHandler = null;
        this._resizeTimeout = null;
        this._lastWidth = 0;
        this._lastHeight = 0;
        this._revision = 0;
    }

    async init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;

        // Sleek initial loader
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:0.85rem; gap:0.5rem;">
                <span style="display:inline-block; animation:spin 1s linear infinite; font-size:1.25rem;">⟳</span>
                <span>Memuat Grafik Pasar Plotly...</span>
            </div>
        `;

        try {
            this.plotly = await getPlotly();
            this._initialized = true;

            // Clear loader
            this.container.innerHTML = '';

            // Render existing queued data
            if (this.data && this.data.length > 0) {
                await this.render();
            }

            // Debounced resize handler to prevent layout loops and flickering
            this._handleResize = () => {
                if (!this.plotly || !this.container) return;
                const currentWidth = this.container.clientWidth;
                const currentHeight = this.container.clientHeight;
                if (currentWidth <= 0 || currentHeight <= 0) return;

                // Ignore micro changes (< 3px) to prevent layout thrashing
                if (Math.abs(currentWidth - this._lastWidth) < 3 && Math.abs(currentHeight - this._lastHeight) < 3) {
                    return;
                }

                this._lastWidth = currentWidth;
                this._lastHeight = currentHeight;

                if (this._resizeTimeout) cancelAnimationFrame(this._resizeTimeout);
                this._resizeTimeout = requestAnimationFrame(() => {
                    if (this.plotly && this.container) {
                        this.plotly.Plots.resize(this.container);
                    }
                });
            };

            this._windowResizeHandler = () => this._handleResize();
            window.addEventListener('resize', this._windowResizeHandler);

            if (typeof ResizeObserver !== 'undefined') {
                this._resizeObserver = new ResizeObserver(() => this._handleResize());
                this._resizeObserver.observe(this.container);
            }
        } catch (err) {
            console.error('Failed to initialize Plotly chart:', err);
            if (this.container) {
                this.container.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#ef4444; font-size:0.85rem;">
                        Gagal memuat pustaka grafik. Periksa koneksi internet.
                    </div>
                `;
            }
        }
    }

    setData(candles) {
        this.data = Array.isArray(candles) ? candles : [];
        if (!this._initialized || !this.plotly) return;
        this.render();
    }

    setChartType(type) {
        if (type !== 'line' && type !== 'candlestick') return;
        if (this.chartType === type) return;
        this.chartType = type;
        this._syncTypeButtons();
        if (this._initialized && this.data && this.data.length > 0) {
            this.render();
        }
    }

    toggleChartType() {
        const next = this.chartType === 'line' ? 'candlestick' : 'line';
        this.setChartType(next);
        return next;
    }

    toggleVolume() {
        this.showVolume = !this.showVolume;
        this._syncVolumeButton();
        if (this._initialized && this.data && this.data.length > 0) {
            this.render();
        }
        return this.showVolume;
    }

    toggleMA() {
        return this.toggleVolume();
    }

    toggleBB() {
        return false;
    }

    injectPatterns(_pts) {}

    _syncTypeButtons() {
        const lineBtn = document.getElementById('btn-chart-type-line');
        const candleBtn = document.getElementById('btn-chart-type-candle');

        if (lineBtn && candleBtn) {
            if (this.chartType === 'line') {
                lineBtn.classList.add('active');
                lineBtn.style.background = 'var(--accent-primary)';
                lineBtn.style.color = '#000';
                lineBtn.style.fontWeight = '800';

                candleBtn.classList.remove('active');
                candleBtn.style.background = 'transparent';
                candleBtn.style.color = 'var(--text-muted)';
                candleBtn.style.fontWeight = '700';
            } else {
                candleBtn.classList.add('active');
                candleBtn.style.background = 'var(--accent-primary)';
                candleBtn.style.color = '#000';
                candleBtn.style.fontWeight = '800';

                lineBtn.classList.remove('active');
                lineBtn.style.background = 'transparent';
                lineBtn.style.color = 'var(--text-muted)';
                lineBtn.style.fontWeight = '700';
            }
        }
    }

    _syncVolumeButton() {
        const btn = document.getElementById('btn-toggle-volume');
        if (btn) {
            if (this.showVolume) {
                btn.style.background = 'rgba(16, 185, 129, 0.2)';
                btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                btn.style.color = '#10b981';
                btn.style.fontWeight = '800';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.04)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                btn.style.color = 'var(--text-muted)';
                btn.style.fontWeight = '700';
            }
        }
    }

    _updateHoverMarker(time, price, volume = null) {
        if (this._clearHoverTimeout) {
            clearTimeout(this._clearHoverTimeout);
            this._clearHoverTimeout = null;
        }
        const markerWrap = document.getElementById('chart-hover-marker-info');
        const timeEl = document.getElementById('chart-hover-time');
        const priceEl = document.getElementById('chart-hover-price');

        if (markerWrap && timeEl && priceEl) {
            markerWrap.style.display = 'inline-flex';
            timeEl.textContent = time;
            const formatted = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: price < 1 ? 4 : 2,
                maximumFractionDigits: price < 1 ? 4 : 2
            }).format(price);
            
            let text = `$ ${formatted}`;
            if (volume !== null && volume !== undefined && volume > 0) {
                text += ` • Vol ${new Intl.NumberFormat('en-US').format(Math.round(volume))}`;
            }
            priceEl.textContent = text;
        }
    }

    _clearHoverMarker(delay = 0) {
        if (this._clearHoverTimeout) {
            clearTimeout(this._clearHoverTimeout);
            this._clearHoverTimeout = null;
        }
        const markerWrap = document.getElementById('chart-hover-marker-info');
        if (!markerWrap) return;

        if (delay > 0) {
            this._clearHoverTimeout = setTimeout(() => {
                markerWrap.style.display = 'none';
            }, delay);
        } else {
            markerWrap.style.display = 'none';
        }
    }

    async render() {
        if (!this.plotly || !this.container) return;
        const candles = this.data;
        if (!candles || candles.length === 0) return;

        // Async re-entrancy lock: if render is already running, queue next
        if (this._isRendering) {
            this._pendingRender = true;
            return;
        }

        this._isRendering = true;

        try {
            const x = candles.map(c => c.time);
            const opens = candles.map(c => c.open);
            const highs = candles.map(c => c.high);
            const lows = candles.map(c => c.low);
            const closes = candles.map(c => c.close);
            const volumes = candles.map(c => Number(c.volume) || 0);

            const firstClose = closes[0] || 0;
            const lastClose = closes[closes.length - 1] || 0;
            const isUp = lastClose >= firstClose;
            const themeColor = isUp ? '#10b981' : '#ef4444';
            const fillColor = isUp ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

            // Dynamic base area calculation from lowest price (stretches pattern across full height)
            const allPrices = this.chartType === 'line'
                ? closes
                : [...lows, ...highs, ...opens, ...closes].filter(p => typeof p === 'number' && !isNaN(p));

            const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 100;
            const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;
            const priceSpan = Math.max(minPrice * 0.005, maxPrice - minPrice);
            const yPadding = priceSpan * 0.15;
            const yMin = Math.max(0.0001, minPrice - yPadding);
            const yMax = maxPrice + yPadding;

            const traces = [];

            // Optional Volume Indicator Bars (Pinned at bottom)
            if (this.showVolume) {
                const volColors = candles.map(c => (c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'));
                traces.push({
                    x,
                    y: volumes,
                    yaxis: 'y2',
                    type: 'bar',
                    name: 'Volume',
                    marker: { color: volColors },
                    hovertemplate: 'Volume: <b>%{y:,.0f}</b><extra></extra>',
                    hoverlabel: {
                        bgcolor: '#18181b',
                        bordercolor: 'rgba(255, 255, 255, 0.2)',
                        font: { color: '#ffffff', size: 11, family: 'Inter, sans-serif' }
                    }
                });
            }

            if (this.chartType === 'line') {
                // Invisible baseline trace at lowest price area (yMin) so area fill anchors to lowest price
                traces.push({
                    x,
                    y: new Array(x.length).fill(yMin),
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'transparent', width: 0 },
                    hoverinfo: 'skip',
                    showlegend: false
                });

                // Smooth Area Line Chart filled down to lowest price base area
                traces.push({
                    x,
                    y: closes,
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: themeColor,
                        width: 2.8,
                        shape: 'spline',
                        smoothing: 0.85
                    },
                    fill: 'tonexty',
                    fillcolor: fillColor,
                    name: 'Harga',
                    hovertemplate: '<b>%{x}</b><br>Harga: <b>$%{y:,.2f}</b><extra></extra>',
                    hoverlabel: {
                        bgcolor: '#18181b',
                        bordercolor: themeColor,
                        font: { color: '#ffffff', size: 12, family: 'Inter, sans-serif' }
                    }
                });
            } else {
                // Candlestick Chart
                traces.push({
                    x,
                    open: opens,
                    high: highs,
                    low: lows,
                    close: closes,
                    type: 'candlestick',
                    increasing: {
                        line: { color: '#10b981', width: 1.5 },
                        fillcolor: '#10b981'
                    },
                    decreasing: {
                        line: { color: '#ef4444', width: 1.5 },
                        fillcolor: '#ef4444'
                    },
                    name: 'Candlestick',
                    hovertemplate:
                        '<b>%{x}</b><br>' +
                        'Open:  <b>$%{open:,.2f}</b><br>' +
                        'High:  <b>$%{high:,.2f}</b><br>' +
                        'Low:   <b>$%{low:,.2f}</b><br>' +
                        'Close: <b>$%{close:,.2f}</b><extra></extra>',
                    hoverlabel: {
                        bgcolor: '#18181b',
                        bordercolor: 'rgba(255, 255, 255, 0.25)',
                        font: { color: '#ffffff', size: 12, family: 'Inter, sans-serif' }
                    }
                });
            }

            // Determine target height to adapt gracefully across screen modes
            const containerHeight = (this.container && this.container.clientHeight > 100)
                ? this.container.clientHeight
                : 440;

            this._revision++;

            const layout = {
                autosize: true,
                height: containerHeight,
                datarevision: this._revision,
                margin: { t: 15, r: 50, b: 35, l: 15 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                showlegend: false,
                dragmode: false, // Completely disable dragmode to eliminate accidental box zoom on mobile touch
                hovermode: 'x unified',
                hoverdistance: 100,
                spikedistance: -1,
                xaxis: {
                    type: 'category',
                    autorange: true,
                    fixedrange: true, // Prevents horizontal drag and zoom displacement
                    showgrid: true,
                    gridcolor: 'rgba(255, 255, 255, 0.04)',
                    gridwidth: 1,
                    zeroline: false,
                    tickfont: { color: '#71717a', size: 10, family: 'Inter, sans-serif' },
                    showline: true,
                    linecolor: 'rgba(255, 255, 255, 0.08)',
                    rangeslider: { visible: false },
                    showspikes: true,
                    spikemode: 'across',
                    spikesnap: 'cursor',
                    spikedash: 'dot',
                    spikethickness: 1,
                    spikecolor: 'rgba(255, 255, 255, 0.35)'
                },
                yaxis: {
                    autorange: false,
                    range: [yMin, yMax],
                    fixedrange: true, // Prevents vertical drag and zoom displacement
                    side: 'right',
                    showgrid: true,
                    gridcolor: 'rgba(255, 255, 255, 0.04)',
                    gridwidth: 1,
                    zeroline: false,
                    tickfont: { color: '#71717a', size: 10, family: 'Inter, sans-serif' },
                    tickprefix: '$ ',
                    showline: true,
                    linecolor: 'rgba(255, 255, 255, 0.08)',
                    showspikes: true,
                    spikemode: 'across',
                    spikesnap: 'cursor',
                    spikethickness: 1,
                    spikedash: 'dot',
                    spikecolor: 'rgba(255, 255, 255, 0.35)'
                }
            };

            if (this.showVolume) {
                const maxVol = Math.max(...volumes, 1);
                layout.yaxis2 = {
                    overlaying: 'y',
                    side: 'left',
                    showgrid: false,
                    showline: false,
                    showticklabels: false,
                    zeroline: false,
                    fixedrange: true, // Prevent volume scale dragging
                    range: [0, maxVol * 4]
                };
            }

            const config = {
                responsive: true,
                displayModeBar: false,
                scrollZoom: false,
                doubleClick: false, // Disables accidental double-click reset
                showAxisDragHandles: false,
                showAxisRangeEntryBoxes: false
            };

            await this.plotly.react(this.container, traces, layout, config);

            // Bind hover & click events once without stripping/re-adding every frame
            if (!this._eventsBound && this.container && this.container.on) {
                this._eventsBound = true;

                const handlePointEvent = (eventData) => {
                    if (!eventData || !eventData.points || eventData.points.length === 0) return;
                    const pt = eventData.points[0];
                    const time = pt.x || '';
                    const price = pt.y !== undefined ? pt.y : (pt.close !== undefined ? pt.close : 0);
                    const candleIdx = pt.pointIndex !== undefined ? pt.pointIndex : -1;
                    const vol = candleIdx >= 0 && this.data[candleIdx] ? this.data[candleIdx].volume : null;
                    this._updateHoverMarker(time, price, vol);
                };

                this.container.on('plotly_hover', handlePointEvent);
                this.container.on('plotly_click', handlePointEvent);

                this.container.on('plotly_unhover', () => {
                    // Give 3.5s delay so mobile users can comfortably read the price info
                    this._clearHoverMarker(3500);
                });
            }
        } catch (err) {
            console.warn('Plotly render error:', err);
        } finally {
            this._isRendering = false;
            if (this._pendingRender) {
                this._pendingRender = false;
                this.render();
            }
        }
    }

    destroy() {
        if (this._clearHoverTimeout) {
            clearTimeout(this._clearHoverTimeout);
            this._clearHoverTimeout = null;
        }
        if (this._windowResizeHandler) {
            window.removeEventListener('resize', this._windowResizeHandler);
            this._windowResizeHandler = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._resizeTimeout) {
            cancelAnimationFrame(this._resizeTimeout);
            this._resizeTimeout = null;
        }
        if (this.plotly && this.container) {
            this.plotly.purge(this.container);
        }
        this._eventsBound = false;
        this._isRendering = false;
        this._pendingRender = false;
        this._clearHoverMarker();
    }
}

export default ChartEngine;

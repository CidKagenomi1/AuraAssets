/**
 * ChartEngine.js - Professional SVG Trading Chart v4
 * Features:
 *  - Realistic candlestick bodies (hammer, shooting star, doji, marubozu)
 *  - Elliott Wave & Head-and-Shoulders pattern annotations
 *  - Zoom (mouse wheel / pinch) & Pan (click+drag)
 *  - EMA(9) and EMA(21) overlays
 *  - MACD sub-panel (MACD line, Signal, Histogram)
 *  - Tooltip ONLY visible when cursor is inside chart bounds
 *  - Volume bars
 *  - Crosshair
 */

class ChartEngine {
    constructor(containerId) {
        this.container  = document.getElementById(containerId);
        this.svg        = null;
        this.tooltip    = null;
        this.data       = [];
        this.viewStart  = 0;
        this.viewEnd    = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartView = 0;
        this._mouseInsideChart = false;  // ← tracks cursor position

        this.config = {
            padding:  { top: 28, right: 68, bottom: 44, left: 8 },
            macdH:    80,   // height reserved for MACD panel (px)
            macdGap:  8,    // gap between price chart and MACD
            colors: {
                bull:       '#26a69a',
                bear:       '#ef5350',
                bullFill:   'rgba(38,166,154,0.85)',
                bearFill:   'rgba(239,83,80,0.85)',
                ema9:       '#f59e0b',
                ema21:      '#a78bfa',
                macdLine:   '#38bdf8',
                macdSignal: '#f472b6',
                macdUp:     'rgba(38,166,154,0.7)',
                macdDown:   'rgba(239,83,80,0.7)',
                grid:       'rgba(255,255,255,0.04)',
                gridH:      'rgba(255,255,255,0.07)',
                text:       '#71717a',
                crosshair:  'rgba(255,255,255,0.22)',
                annotation: '#facc15',
                hs:         '#f472b6',
            },
            showEMA:     true,
            showMACD:    true,
            ema9Period:  9,
            ema21Period: 21,
            macdFast:    12,
            macdSlow:    26,
            macdSignal:  9,
            minCandles:  8,
            maxCandles:  80,
            defaultView: 40,
        };

        this.width  = 0;
        this.height = 0;
        this.scaleX  = null;
        this.scaleY  = null;  // price scale (main panel)
        this.scaleMY = null;  // MACD scale
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    init() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="chart-wrapper" style="
                position:relative;width:100%;height:100%;
                overflow:hidden;cursor:crosshair;
                user-select:none;-webkit-user-select:none;
            ">
                <svg id="trading-chart-svg" style="width:100%;height:100%;display:block;"></svg>
                <div id="chart-tooltip" style="
                    position:absolute;display:none;pointer-events:none;
                    background:rgba(9,9,11,0.96);border:1px solid rgba(255,255,255,0.12);
                    padding:10px 14px;border-radius:10px;font-size:11px;z-index:20;
                    backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.5);
                    min-width:160px;font-family:inherit;
                "></div>
                <div id="chart-controls" style="
                    position:absolute;top:4px;right:4px;display:flex;gap:4px;z-index:15;
                ">
                    <button class="chart-ctrl-btn" id="btn-zoom-in"  title="Zoom In"  style="${this._ctrlStyle()}">+</button>
                    <button class="chart-ctrl-btn" id="btn-zoom-out" title="Zoom Out" style="${this._ctrlStyle()}">−</button>
                    <button class="chart-ctrl-btn" id="btn-zoom-fit" title="Reset"    style="${this._ctrlStyle()}">⊡</button>
                </div>
                <!-- EMA Legend -->
                <div style="position:absolute;top:4px;left:8px;display:flex;gap:10px;font-size:10px;font-weight:600;z-index:15;pointer-events:none;">
                    <span id="ema-legend-9"  style="color:#f59e0b;">● EMA9</span>
                    <span id="ema-legend-21" style="color:#a78bfa;">● EMA21</span>
                </div>
            </div>
        `;

        this.svg     = this.container.querySelector('#trading-chart-svg');
        this.tooltip = this.container.querySelector('#chart-tooltip');

        this._bindEvents();
        this._resize();
    }

    _ctrlStyle() {
        return `
            width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.06);color:#a1a1aa;font-size:14px;font-weight:700;
            cursor:pointer;display:flex;align-items:center;justify-content:center;
            transition:background .15s;padding:0;
        `;
    }

    _resize() {
        const rect  = this.container.getBoundingClientRect();
        this.width  = rect.width  || 600;
        this.height = rect.height || 400;
        this.render();
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    _bindEvents() {
        window.addEventListener('resize', () => this._resize());

        // Wheel → zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._zoom(e.deltaY > 0 ? 1.2 : 0.85, e.clientX);
        }, { passive: false });

        // Drag → pan
        this.container.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isDragging    = true;
            this.dragStartX    = e.clientX;
            this.dragStartView = this.viewStart;
            this.container.style.cursor = 'grabbing';
        });

        // ── Mouse move: ONLY update tooltip when cursor inside chart ──────────
        this.container.addEventListener('mousemove', (e) => {
            this._mouseInsideChart = true;
            if (this.isDragging) {
                this._pan(e.clientX);
            } else {
                this._handleMouseMove(e);
            }
        });

        // Mouse leaves the chart container → hide tooltip immediately
        this.container.addEventListener('mouseleave', () => {
            this._mouseInsideChart = false;
            this._handleMouseLeave();
        });

        // Global mouseup (drag end)
        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'crosshair';
            }
        });

        // Touch zoom (pinch)
        let lastTouchDist = null;
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (lastTouchDist) {
                    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    this._zoom(lastTouchDist / dist, midX);
                }
                lastTouchDist = dist;
            }
        }, { passive: true });

        this.container.addEventListener('touchend', () => this._handleMouseLeave(), { passive: true });

        // Control buttons
        document.getElementById('btn-zoom-in') ?.addEventListener('click', () => this._zoom(0.75));
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this._zoom(1.35));
        document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
            this.viewStart = 0;
            this.viewEnd   = this.data.length;
            this.render();
        });
    }

    // ─── Zoom / Pan ───────────────────────────────────────────────────────────

    _zoom(factor, clientX = null) {
        const n = this.viewEnd - this.viewStart;
        let newN = Math.round(n * factor);
        newN = Math.max(this.config.minCandles, Math.min(this.config.maxCandles, newN));
        newN = Math.min(newN, this.data.length);

        let anchorFrac = 0.5;
        if (clientX !== null) {
            const rect = this.container.getBoundingClientRect();
            anchorFrac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        }

        const anchorIdx = this.viewStart + anchorFrac * n;
        let newStart    = Math.round(anchorIdx - anchorFrac * newN);
        newStart = Math.max(0, Math.min(this.data.length - newN, newStart));

        this.viewStart = newStart;
        this.viewEnd   = newStart + newN;
        this.render();
    }

    _pan(clientX) {
        const { left, right } = this.config.padding;
        const drawWidth = this.width - left - right;
        const viewN     = this.viewEnd - this.viewStart;
        const pxPerBar  = drawWidth / viewN;
        const deltaIdx  = Math.round((this.dragStartX - clientX) / pxPerBar);

        let newStart = this.dragStartView + deltaIdx;
        newStart = Math.max(0, Math.min(this.data.length - viewN, newStart));

        this.viewStart = newStart;
        this.viewEnd   = newStart + viewN;
        this.render();
    }

    // ─── Data ─────────────────────────────────────────────────────────────────

    setData(data) {
        this.data = data;
        this._calculateIndicators();
        const n = Math.min(this.config.defaultView, this.data.length);
        this.viewStart = Math.max(0, this.data.length - n);
        this.viewEnd   = this.data.length;
        this.render();
    }

    _calculateIndicators() {
        const closes = this.data.map(d => d.close);
        const len    = closes.length;

        // ── EMA helper ────────────────────────────────────────────────────────
        const calcEMA = (period) => {
            const k   = 2 / (period + 1);
            const ema = new Array(len).fill(null);
            let started = false;
            let prev    = 0;
            for (let i = 0; i < len; i++) {
                if (i < period - 1) continue;
                if (!started) {
                    let sum = 0;
                    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
                    prev    = sum / period;
                    ema[i]  = prev;
                    started = true;
                } else {
                    prev    = closes[i] * k + prev * (1 - k);
                    ema[i]  = prev;
                }
            }
            return ema;
        };

        const ema9  = calcEMA(this.config.ema9Period);
        const ema21 = calcEMA(this.config.ema21Period);
        const ema12 = calcEMA(this.config.macdFast);
        const ema26 = calcEMA(this.config.macdSlow);

        // MACD line = EMA12 - EMA26
        const macdLine = new Array(len).fill(null);
        for (let i = 0; i < len; i++) {
            if (ema12[i] != null && ema26[i] != null) {
                macdLine[i] = ema12[i] - ema26[i];
            }
        }

        // Signal line = EMA9 of MACD line
        const signal = new Array(len).fill(null);
        const sig    = this.config.macdSignal;
        let sigStart = false, sigPrev = 0;
        for (let i = 0; i < len; i++) {
            if (macdLine[i] == null) continue;
            if (!sigStart) {
                let cnt = 0, sum2 = 0;
                for (let j = i; j < len && cnt < sig; j++) {
                    if (macdLine[j] != null) { sum2 += macdLine[j]; cnt++; }
                }
                if (cnt === sig) {
                    sigPrev      = sum2 / sig;
                    signal[i + sig - 1] = sigPrev;
                    sigStart = true;
                }
            } else {
                const k2    = 2 / (sig + 1);
                sigPrev     = macdLine[i] * k2 + sigPrev * (1 - k2);
                signal[i]   = sigPrev;
            }
        }

        // Assign to data
        for (let i = 0; i < len; i++) {
            this.data[i].ema9     = ema9[i];
            this.data[i].ema21    = ema21[i];
            this.data[i].macdLine = macdLine[i];
            this.data[i].macdSig  = signal[i];
            this.data[i].macdHist = (macdLine[i] != null && signal[i] != null)
                ? macdLine[i] - signal[i]
                : null;
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        if (!this.svg || !this.data.length) return;

        const { top, right, bottom, left } = this.config.padding;
        const { macdH, macdGap } = this.config;
        const totalH = this.height;
        const priceH = this.config.showMACD
            ? totalH - top - bottom - macdH - macdGap
            : totalH - top - bottom;
        const drawW  = this.width - left - right;

        const slice = this.data.slice(this.viewStart, this.viewEnd);
        const n     = slice.length;
        if (n === 0) return;

        // Price range
        const minP    = Math.min(...slice.map(d => d.low));
        const maxP    = Math.max(...slice.map(d => d.high));
        const diffP   = maxP - minP || 1;
        const minY    = minP - diffP * 0.12;
        const maxY    = maxP + diffP * 0.12;

        // Scales
        const barSlot = drawW / n;
        this.scaleX   = (si)  => left + (si + 0.5) * barSlot;
        this.scaleY   = (val) => top  + priceH - ((val - minY) / (maxY - minY) * priceH);

        // MACD scale
        const macdTop = top + priceH + macdGap;
        const mVals   = slice.map(d => d.macdHist).filter(v => v != null);
        const mMax    = mVals.length ? Math.max(Math.abs(Math.min(...mVals)), Math.max(...mVals), 0.0001) : 1;
        this.scaleMY  = (val) => macdTop + macdH / 2 - (val / mMax) * (macdH / 2 - 4);

        // Clear & draw
        this.svg.innerHTML = '';
        this._drawGrid(drawW, priceH);
        this._drawVolume(slice, drawW, priceH);
        if (this.config.showEMA) this._drawEMA(slice);
        this._drawCandles(slice, barSlot);
        this._drawPatternAnnotations(slice);
        this._drawYAxis(minY, maxY, drawW, priceH);
        this._drawXAxis(slice, barSlot, priceH);
        this._drawCurrentPriceLine(slice, drawW, priceH);
        if (this.config.showMACD) this._drawMACD(slice, drawW, macdTop);
    }

    // ─── Drawing Helpers ──────────────────────────────────────────────────────

    _makeSVG(tag, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    }

    _drawGrid(drawW, priceH) {
        const { top, left } = this.config.padding;
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const y = top + (i / steps) * priceH;
            this.svg.appendChild(this._makeSVG('line', {
                x1: left, y1: y, x2: left + drawW, y2: y,
                stroke: (i === 0 || i === steps) ? this.config.colors.gridH : this.config.colors.grid,
                'stroke-width': '1'
            }));
        }
    }

    _drawYAxis(minY, maxY, drawW, priceH) {
        const { top, left } = this.config.padding;
        const steps = 6;
        const xPos  = left + drawW + 5;
        for (let i = 0; i <= steps; i++) {
            const y     = top + (i / steps) * priceH;
            const price = maxY - (i / steps) * (maxY - minY);
            const txt   = this._makeSVG('text', { x: xPos, y: y + 4, fill: this.config.colors.text, 'font-size': '9.5px', 'font-weight': '600', 'font-family': 'inherit' });
            txt.textContent = this._fmtPrice(price);
            this.svg.appendChild(txt);
        }
    }

    _drawXAxis(slice, barSlot, priceH) {
        const { top, left } = this.config.padding;
        const y    = top + priceH + 14;
        const step = Math.max(1, Math.round(slice.length / 6));
        for (let i = 0; i < slice.length; i += step) {
            const x   = this.scaleX(i);
            const txt = this._makeSVG('text', { x, y, fill: this.config.colors.text, 'font-size': '9px', 'text-anchor': 'middle', 'font-family': 'inherit' });
            txt.textContent = slice[i].time || `T${this.viewStart + i}`;
            this.svg.appendChild(txt);
        }
    }

    _drawVolume(slice, drawW, priceH) {
        const { top, left } = this.config.padding;
        const maxV    = Math.max(...slice.map(d => d.volume)) || 1;
        const barSlot = drawW / slice.length;
        const barW    = Math.max(1, barSlot * 0.7);
        const volH    = priceH * 0.15;

        slice.forEach((d, i) => {
            const x  = this.scaleX(i) - barW / 2;
            const h  = (d.volume / maxV) * volH;
            const y  = top + priceH - h;
            this.svg.appendChild(this._makeSVG('rect', {
                x, y, width: barW, height: h, rx: '1',
                fill: d.close >= d.open ? 'rgba(38,166,154,0.18)' : 'rgba(239,83,80,0.18)',
            }));
        });
    }

    _drawEMA(slice) {
        const draw = (key, color) => {
            const pts = slice
                .map((d, i) => d[key] != null ? `${this.scaleX(i)},${this.scaleY(d[key])}` : null)
                .filter(Boolean).join(' ');
            if (!pts) return;
            this.svg.appendChild(this._makeSVG('polyline', {
                points: pts, fill: 'none', stroke: color, 'stroke-width': '1.4',
                'stroke-linejoin': 'round', 'stroke-linecap': 'round',
            }));
        };
        draw('ema9',  this.config.colors.ema9);
        draw('ema21', this.config.colors.ema21);
    }

    _drawCandles(slice, barSlot) {
        const barW = Math.max(2, barSlot * 0.68);
        slice.forEach((d, i) => {
            const cx     = this.scaleX(i);
            const openY  = this.scaleY(d.open);
            const closeY = this.scaleY(d.close);
            const highY  = this.scaleY(d.high);
            const lowY   = this.scaleY(d.low);
            const isBull = d.close >= d.open;
            const color  = isBull ? this.config.colors.bull : this.config.colors.bear;
            const fill   = isBull ? this.config.colors.bullFill : this.config.colors.bearFill;

            this.svg.appendChild(this._makeSVG('line', {
                x1: cx, y1: highY, x2: cx, y2: lowY,
                stroke: color, 'stroke-width': Math.max(1, barW * 0.12),
            }));

            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(2, Math.abs(closeY - openY));
            const rx    = barW > 6 ? Math.min(2.5, barW * 0.15) : 0;

            this.svg.appendChild(this._makeSVG('rect', {
                x: cx - barW / 2, y: bodyY, width: barW, height: bodyH,
                fill, stroke: color, 'stroke-width': '0.6', rx,
            }));
        });
    }

    _drawCurrentPriceLine(slice, drawW, priceH) {
        if (!slice.length) return;
        const last   = slice[slice.length - 1];
        const y      = this.scaleY(last.close);
        const { left, right } = this.config.padding;
        const isBull = last.close >= last.open;
        const color  = isBull ? this.config.colors.bull : this.config.colors.bear;

        this.svg.appendChild(this._makeSVG('line', {
            x1: left, y1: y, x2: left + drawW, y2: y,
            stroke: color, 'stroke-width': '0.8', 'stroke-dasharray': '4 3', opacity: '0.6',
        }));

        const badgeX = left + drawW + 2;
        this.svg.appendChild(this._makeSVG('rect', { x: badgeX, y: y - 9, width: right - 4, height: 16, fill: color, rx: '3' }));
        const txt = this._makeSVG('text', { x: badgeX + (right - 4) / 2, y: y + 3.5, fill: 'white', 'font-size': '8.5px', 'font-weight': '700', 'text-anchor': 'middle', 'font-family': 'inherit' });
        txt.textContent = this._fmtPrice(last.close);
        this.svg.appendChild(txt);
    }

    _drawMACD(slice, drawW, macdTop) {
        const { left } = this.config.padding;
        const { macdH } = this.config;
        const zeroY   = macdTop + macdH / 2;

        // Zero line
        this.svg.appendChild(this._makeSVG('line', {
            x1: left, y1: zeroY, x2: left + drawW, y2: zeroY,
            stroke: 'rgba(255,255,255,0.08)', 'stroke-width': '1',
        }));

        // MACD label
        const lbl = this._makeSVG('text', { x: left + 2, y: macdTop + 10, fill: this.config.colors.text, 'font-size': '8px', 'font-weight': '700', 'font-family': 'inherit' });
        lbl.textContent = 'MACD(12,26,9)';
        this.svg.appendChild(lbl);

        const barSlot = drawW / slice.length;
        const barW    = Math.max(1, barSlot * 0.6);

        // Histogram bars
        slice.forEach((d, i) => {
            if (d.macdHist == null) return;
            const x    = this.scaleX(i) - barW / 2;
            const yVal = this.scaleMY(d.macdHist);
            const h    = Math.abs(zeroY - yVal);
            const y    = d.macdHist >= 0 ? yVal : zeroY;
            this.svg.appendChild(this._makeSVG('rect', {
                x, y, width: barW, height: Math.max(1, h), rx: '1',
                fill: d.macdHist >= 0 ? this.config.colors.macdUp : this.config.colors.macdDown,
            }));
        });

        // MACD line
        const macdPts = slice
            .map((d, i) => d.macdLine != null ? `${this.scaleX(i)},${this.scaleMY(d.macdLine)}` : null)
            .filter(Boolean).join(' ');
        if (macdPts) {
            this.svg.appendChild(this._makeSVG('polyline', {
                points: macdPts, fill: 'none',
                stroke: this.config.colors.macdLine, 'stroke-width': '1.2',
                'stroke-linejoin': 'round',
            }));
        }

        // Signal line
        const sigPts = slice
            .map((d, i) => d.macdSig != null ? `${this.scaleX(i)},${this.scaleMY(d.macdSig)}` : null)
            .filter(Boolean).join(' ');
        if (sigPts) {
            this.svg.appendChild(this._makeSVG('polyline', {
                points: sigPts, fill: 'none',
                stroke: this.config.colors.macdSignal, 'stroke-width': '1.2',
                'stroke-linejoin': 'round',
            }));
        }
    }

    _drawPatternAnnotations(slice) {
        slice.forEach((d, i) => {
            if (!d.pattern) return;
            const cx  = this.scaleX(i);
            const y   = this.scaleY(d.high) - 12;
            const lbl = d.pattern;
            const lw  = lbl.length * 5.5 + 8;
            const bc  = d.patternType === 'hs' ? this.config.colors.hs : this.config.colors.annotation;

            this.svg.appendChild(this._makeSVG('rect', { x: cx - lw / 2, y: y - 9, width: lw, height: 13, fill: bc, rx: '3', opacity: '0.92' }));
            const txt = this._makeSVG('text', { x: cx, y: y + 1.5, fill: 'black', 'font-size': '7.5px', 'font-weight': '800', 'text-anchor': 'middle', 'font-family': 'inherit' });
            txt.textContent = lbl;
            this.svg.appendChild(txt);

            this.svg.appendChild(this._makeSVG('line', {
                x1: cx, y1: y + 4, x2: cx, y2: this.scaleY(d.high),
                stroke: bc, 'stroke-width': '1', 'stroke-dasharray': '2 2', opacity: '0.6',
            }));
        });

        if (this._hsPts?.length >= 2) {
            const pts = this._hsPts
                .filter(p => p.idx >= this.viewStart && p.idx < this.viewEnd)
                .map(p => `${this.scaleX(p.idx - this.viewStart)},${this.scaleY(p.price)}`);
            if (pts.length >= 2) {
                this.svg.appendChild(this._makeSVG('polyline', {
                    points: pts.join(' '), fill: 'none',
                    stroke: this.config.colors.hs, 'stroke-width': '1.2',
                    'stroke-dasharray': '5 4', opacity: '0.7',
                }));
            }
        }
    }

    // ─── Crosshair & Tooltip ──────────────────────────────────────────────────

    _handleMouseMove(e) {
        if (!this.data.length || !this.scaleX) return;

        const rect   = this.svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Hide tooltip if cursor is outside SVG bounds
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
            this._handleMouseLeave();
            return;
        }

        const { left, right } = this.config.padding;
        const drawW   = this.width - left - right;
        const viewN   = this.viewEnd - this.viewStart;
        const barSlot = drawW / viewN;

        let si = Math.round((mouseX - left) / barSlot - 0.5);
        si = Math.max(0, Math.min(viewN - 1, si));
        const d = this.data[this.viewStart + si];
        if (!d) return;

        const cx = this.scaleX(si);
        const cy = this.scaleY(d.close);

        this._drawCrosshair(cx, cy);

        // Tooltip
        const isBull = d.close >= d.open;
        const chg    = d.open > 0 ? ((d.close - d.open) / d.open * 100).toFixed(2) : '0.00';
        const cc     = isBull ? '#26a69a' : '#ef5350';
        const tW     = 175;
        let tx = cx + 18;
        if (tx + tW > this.width) tx = cx - tW - 8;

        const macdVal = d.macdLine != null ? d.macdLine.toFixed(4) : '—';
        const sigVal  = d.macdSig  != null ? d.macdSig.toFixed(4)  : '—';
        const histVal = d.macdHist != null ? (d.macdHist >= 0 ? '+' : '') + d.macdHist.toFixed(4) : '—';
        const histColor = d.macdHist != null ? (d.macdHist >= 0 ? '#26a69a' : '#ef5350') : '#71717a';

        this.tooltip.style.display = 'block';
        this.tooltip.style.left    = tx + 'px';
        this.tooltip.style.top     = Math.max(4, cy - 60) + 'px';
        this.tooltip.innerHTML = `
            <div style="font-weight:800;color:white;margin-bottom:6px;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:5px;">
                ${d.time || `T${this.viewStart + si}`}
                <span style="float:right;color:${cc};font-size:11px">${isBull ? '▲' : '▼'} ${Math.abs(chg)}%</span>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:10.5px;">
                <span style="color:#71717a">O</span><span style="color:white;text-align:right">${this._fmtPrice(d.open)}</span>
                <span style="color:#26a69a">H</span><span style="color:white;text-align:right">${this._fmtPrice(d.high)}</span>
                <span style="color:#ef5350">L</span><span style="color:white;text-align:right">${this._fmtPrice(d.low)}</span>
                <span style="color:#71717a">C</span><span style="color:${cc};font-weight:700;text-align:right">${this._fmtPrice(d.close)}</span>
            </div>
            <div style="margin-top:5px;border-top:1px solid rgba(255,255,255,0.06);padding-top:5px;font-size:10px;">
                <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;color:#71717a;">
                    <span>EMA9</span><span style="color:#f59e0b;text-align:right">${d.ema9 != null ? this._fmtPrice(d.ema9) : '—'}</span>
                    <span>EMA21</span><span style="color:#a78bfa;text-align:right">${d.ema21 != null ? this._fmtPrice(d.ema21) : '—'}</span>
                    <span>MACD</span><span style="color:#38bdf8;text-align:right">${macdVal}</span>
                    <span>Signal</span><span style="color:#f472b6;text-align:right">${sigVal}</span>
                    <span>Hist</span><span style="color:${histColor};font-weight:700;text-align:right">${histVal}</span>
                </div>
                ${d.pattern ? `<div style="margin-top:4px;text-align:right"><span style="background:${d.patternType === 'hs' ? '#f472b6' : '#facc15'};color:black;border-radius:3px;padding:1px 5px;font-weight:700;font-size:9px;">${d.pattern}</span></div>` : ''}
            </div>
        `;
    }

    _drawCrosshair(cx, cy) {
        const old = this.svg.querySelector('.ch');
        if (old) old.remove();

        const g = this._makeSVG('g');
        g.classList.add('ch');

        const { top, left, right } = this.config.padding;
        const { macdH, macdGap, showMACD } = this.config;
        const drawW  = this.width  - left - right;
        const priceH = showMACD
            ? this.height - top - this.config.padding.bottom - macdH - macdGap
            : this.height - top - this.config.padding.bottom;

        g.appendChild(this._makeSVG('line', { x1: cx, y1: top, x2: cx, y2: top + priceH, stroke: this.config.colors.crosshair, 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
        g.appendChild(this._makeSVG('line', { x1: left, y1: cy, x2: left + drawW, y2: cy, stroke: this.config.colors.crosshair, 'stroke-width': '1', 'stroke-dasharray': '4 3' }));

        this.svg.appendChild(g);
    }

    _handleMouseLeave() {
        const old = this.svg?.querySelector('.ch');
        if (old) old.remove();
        if (this.tooltip) this.tooltip.style.display = 'none';
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    _fmtPrice(val) {
        if (!isFinite(val)) return '—';
        if (val >= 1000) return '$' + Math.round(val).toLocaleString();
        if (val >= 1)    return '$' + val.toFixed(2);
        return '$' + val.toFixed(5);
    }

    formatCurrency(val) { return this._fmtPrice(val); }

    toggleEMA() {
        this.config.showEMA = !this.config.showEMA;
        this.render();
        return this.config.showEMA;
    }

    toggleMACD() {
        this.config.showMACD = !this.config.showMACD;
        this.render();
        return this.config.showMACD;
    }

    // Keep toggleMA/toggleBB as aliases for compatibility
    toggleMA() { return this.toggleEMA(); }
    toggleBB() { return this.toggleMACD(); }

    injectPatterns(hsPts) {
        this._hsPts = hsPts || [];
    }
}

export default ChartEngine;

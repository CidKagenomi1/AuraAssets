/**
 * ChartEngine.js - High-performance SVG Trading Chart (Vanilla JS)
 * - Candlestick rendering
 * - Volume bars
 * - Moving Average (MA) support
 * - Real-time smooth updates
 * - Tooltip & Crosshair
 */

class ChartEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.data = [];
        this.config = {
            padding: { top: 20, right: 60, bottom: 40, left: 10 },
            colors: {
                bull: '#10b981',
                bear: '#ef4444',
                ma: '#6366f1',
                volume: 'rgba(255, 255, 255, 0.05)',
                grid: 'rgba(255, 255, 255, 0.05)',
                text: '#a1a1aa',
                crosshair: 'rgba(255, 255, 255, 0.3)'
            },
            showMA: true,
            maPeriod: 7
        };
        this.width = 0;
        this.height = 0;
        this.scaleX = null;
        this.scaleY = null;
    }

    init() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="chart-wrapper" style="position: relative; width: 100%; height: 100%; overflow: hidden; cursor: crosshair;">
                <svg id="trading-chart-svg" style="width: 100%; height: 100%; display: block;"></svg>
                <div id="chart-tooltip" class="chart-tooltip" style="
                    position: absolute; display: none; pointer-events: none;
                    background: rgba(9, 9, 11, 0.95); border: 1px solid rgba(255,255,255,0.1);
                    padding: 8px 12px; border-radius: 8px; font-size: 11px; z-index: 10;
                    backdrop-filter: blur(8px); box-shadow: var(--shadow-lg);
                "></div>
            </div>
        `;
        this.svg = this.container.querySelector('#trading-chart-svg');
        this.tooltip = this.container.querySelector('#chart-tooltip');
        this.bindEvents();
        this.resize();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.render();
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.container.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    setData(data) {
        // Data format: { time, open, high, low, close, volume }
        this.data = data;
        this.calculateMA();
        this.render();
    }

    calculateMA() {
        const period = this.config.maPeriod;
        for (let i = 0; i < this.data.length; i++) {
            if (i < period - 1) {
                this.data[i].ma = null;
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += this.data[i - j].close;
            }
            this.data[i].ma = sum / period;
        }
    }

    render() {
        if (!this.svg || !this.data.length) return;

        const { top, right, bottom, left } = this.config.padding;
        const drawWidth = this.width - left - right;
        const drawHeight = this.height - top - bottom;

        // Scales
        const minP = Math.min(...this.data.map(d => d.low));
        const maxP = Math.max(...this.data.map(d => d.high));
        const diffP = maxP - minP || 1;
        const marginP = diffP * 0.1;

        const minY = minP - marginP;
        const maxY = maxP + marginP;

        this.scaleX = (index) => left + (index * (drawWidth / (this.data.length - 1 || 1)));
        this.scaleY = (val) => top + drawHeight - ((val - minY) / (maxY - minY) * drawHeight);

        // Clear SVG
        this.svg.innerHTML = '';

        // Draw Grid
        this.drawGrid(minY, maxY, drawWidth, drawHeight);

        // Draw Volume (background)
        this.drawVolume(drawWidth, drawHeight);

        // Draw Moving Average
        if (this.config.showMA) this.drawMA();

        // Draw Candlesticks
        this.drawCandles(drawWidth);

        // Draw Y-Axis Labels
        this.drawYAxis(minY, maxY, drawWidth, drawHeight);
    }

    drawGrid(minY, maxY, width, height) {
        const { top, left } = this.config.padding;
        const stepCount = 5;
        for (let i = 0; i <= stepCount; i++) {
            const y = top + (i * (height / stepCount));
            const price = maxY - (i * (maxY - minY) / stepCount);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', left);
            line.setAttribute('y1', y);
            line.setAttribute('x2', left + width);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', this.config.colors.grid);
            line.setAttribute('stroke-width', '1');
            this.svg.appendChild(line);
        }
    }

    drawVolume(width, height) {
        const { top, left, bottom } = this.config.padding;
        const maxV = Math.max(...this.data.map(d => d.volume)) || 1;
        const barWidth = (width / this.data.length) * 0.6;
        const volHeight = height * 0.2;

        this.data.forEach((d, i) => {
            const x = this.scaleX(i) - barWidth / 2;
            const h = (d.volume / maxV) * volHeight;
            const y = this.height - bottom - h;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', h);
            rect.setAttribute('fill', this.config.colors.volume);
            rect.setAttribute('rx', '1');
            this.svg.appendChild(rect);
        });
    }

    drawMA() {
        const points = this.data
            .map((d, i) => d.ma ? `${this.scaleX(i)},${this.scaleY(d.ma)}` : null)
            .filter(p => p)
            .join(' ');

        if (!points) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        path.setAttribute('points', points);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.config.colors.ma);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        this.svg.appendChild(path);
    }

    drawCandles(width) {
        const barWidth = Math.max(1, (width / this.data.length) * 0.7);

        this.data.forEach((d, i) => {
            const x = this.scaleX(i);
            const openY = this.scaleY(d.open);
            const closeY = this.scaleY(d.close);
            const highY = this.scaleY(d.high);
            const lowY = this.scaleY(d.low);

            const isBull = d.close >= d.open;
            const color = isBull ? this.config.colors.bull : this.config.colors.bear;

            // Wick
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', highY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', lowY);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '1.5');
            this.svg.appendChild(line);

            // Body
            const bodyH = Math.max(1, Math.abs(openY - closeY));
            const bodyY = Math.min(openY, closeY);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - barWidth / 2);
            rect.setAttribute('y', bodyY);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', bodyH);
            rect.setAttribute('fill', color);
            rect.setAttribute('rx', barWidth > 4 ? '2' : '0');
            this.svg.appendChild(rect);
        });
    }

    drawYAxis(minY, maxY, width, height) {
        const { top, left } = this.config.padding;
        const stepCount = 5;
        const xPos = left + width + 5;

        for (let i = 0; i <= stepCount; i++) {
            const y = top + (i * (height / stepCount));
            const price = maxY - (i * (maxY - minY) / stepCount);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', xPos);
            text.setAttribute('y', y + 4);
            text.setAttribute('fill', this.config.colors.text);
            text.setAttribute('font-size', '10px');
            text.setAttribute('font-weight', '600');
            text.textContent = this.formatCurrency(price);
            this.svg.appendChild(text);
        }
    }

    formatCurrency(val) {
        if (val >= 1000) return '$' + Math.round(val).toLocaleString();
        return '$' + val.toFixed(2);
    }

    handleMouseMove(e) {
        if (!this.data.length || !this.scaleX) return;

        const rect = this.svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Find closest index
        const { left, right } = this.config.padding;
        const drawWidth = this.width - left - right;
        let index = Math.round(((x - left) / drawWidth) * (this.data.length - 1));
        index = Math.max(0, Math.min(this.data.length - 1, index));

        const d = this.data[index];
        const pointX = this.scaleX(index);
        const pointY = this.scaleY(d.close);

        // Crosshair
        this.drawCrosshair(pointX);

        // Tooltip
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (pointX > this.width / 2 ? pointX - 150 : pointX + 15) + 'px';
        this.tooltip.style.top = (pointY > this.height / 2 ? pointY - 100 : pointY + 20) + 'px';

        const isBull = d.close >= d.open;
        this.tooltip.innerHTML = `
            <div style="font-weight: 700; color: white; margin-bottom: 4px;">${d.time || 'Live'}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <span style="color: var(--text-muted)">O:</span> <span style="color: white">${this.formatCurrency(d.open)}</span>
                <span style="color: var(--text-muted)">H:</span> <span style="color: white">${this.formatCurrency(d.high)}</span>
                <span style="color: var(--text-muted)">L:</span> <span style="color: white">${this.formatCurrency(d.low)}</span>
                <span style="color: var(--text-muted)">C:</span> <span style="color: ${isBull ? '#10b981' : '#ef4444'}">${this.formatCurrency(d.close)}</span>
            </div>
            <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
                <span style="color: var(--text-muted)">Vol:</span> <span style="color: white">${Math.round(d.volume).toLocaleString()}</span>
            </div>
        `;
    }

    drawCrosshair(x) {
        // Remove old crosshair
        const old = this.svg.querySelector('.crosshair');
        if (old) old.remove();

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('crosshair');
        line.setAttribute('x1', x);
        line.setAttribute('y1', this.config.padding.top);
        line.setAttribute('x2', x);
        line.setAttribute('y2', this.height - this.config.padding.bottom);
        line.setAttribute('stroke', this.config.colors.crosshair);
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 4');
        this.svg.appendChild(line);
    }

    handleMouseLeave() {
        const old = this.svg.querySelector('.crosshair');
        if (old) old.remove();
        this.tooltip.style.display = 'none';
    }
}

export default ChartEngine;

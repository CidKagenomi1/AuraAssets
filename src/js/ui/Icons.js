/**
 * Icons.js - Centralized Modern SVG Icon Library
 * Provides crisp, lightweight vector icons replacing emojis across the app.
 * Follows 24x24 viewBox standard with customizable size, stroke, and colors.
 */

export const Icons = {
  /**
   * Helper to wrap SVG path with standard attributes
   */
  svg(pathContent, size = 16, color = 'currentColor', strokeWidth = 2, extraClass = '') {
    return `<svg class="svg-icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;">${pathContent}</svg>`;
  },

  /**
   * Filled circle dot (for live status, bid/ask depth)
   */
  circleFilled(size = 8, color = 'currentColor', extraClass = '') {
    return `<svg class="svg-icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="none" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><circle cx="12" cy="12" r="8"/></svg>`;
  },

  // Navigation & Global
  globe(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      size, color
    );
  },

  settings(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      size, color
    );
  },

  bell(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      size, color
    );
  },

  search(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      size, color
    );
  },

  close(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      size, color
    );
  },

  x(size = 16, color = 'currentColor') {
    return this.close(size, color);
  },

  chevronDown(size = 14, color = 'currentColor') {
    return this.svg('<polyline points="6 9 12 15 18 9"/>', size, color, 2.5);
  },

  chevronUp(size = 14, color = 'currentColor') {
    return this.svg('<polyline points="18 15 12 9 6 15"/>', size, color, 2.5);
  },

  // Financial & Trading Charts
  chart(size = 16, color = 'currentColor') {
    return this.svg(
      '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      size, color, 2.2
    );
  },

  trendingUp(size = 16, color = 'currentColor') {
    return this.chart(size, color);
  },

  trendingDown(size = 16, color = 'currentColor') {
    return this.svg(
      '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
      size, color, 2.2
    );
  },

  candle(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="8" y1="2" x2="8" y2="6"/><rect x="5" y="6" width="6" height="10" rx="1"/><line x1="8" y1="16" x2="8" y2="22"/><line x1="16" y1="4" x2="16" y2="9"/><rect x="13" y="9" width="6" height="7" rx="1"/><line x1="16" y1="16" x2="16" y2="20"/>',
      size, color
    );
  },

  volume(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="18" y1="20" x2="18" y2="4"/><line x1="12" y1="20" x2="12" y2="10"/><line x1="6" y1="20" x2="6" y2="15"/>',
      size, color, 2.5
    );
  },

  barChart(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
      size, color, 2.2
    );
  },

  activity(size = 16, color = 'currentColor') {
    return this.svg(
      '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      size, color, 2.2
    );
  },

  // Directional & Statistics
  arrowUpRight(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
      size, color, 2.5
    );
  },

  arrowDownRight(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/>',
      size, color, 2.5
    );
  },

  arrowUp(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
      size, color, 2.5
    );
  },

  arrowDown(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
      size, color, 2.5
    );
  },

  box(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      size, color
    );
  },

  zap(size = 16, color = 'currentColor') {
    return this.svg(
      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      size, color, 2
    );
  },

  flame(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
      size, color, 2
    );
  },

  scale(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><line x1="7" y1="21" x2="17" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 8l7-3 7 3"/>',
      size, color
    );
  },

  lightbulb(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
      size, color
    );
  },

  // Execution & Trading Panels
  target(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      size, color
    );
  },

  shield(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      size, color
    );
  },

  shieldAlert(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      size, color
    );
  },

  wallet(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><circle cx="18" cy="14" r="2"/>',
      size, color
    );
  },

  dollar(size = 16, color = 'currentColor') {
    return this.svg(
      '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      size, color, 2.2
    );
  },

  inbox(size = 16, color = 'currentColor') {
    return this.svg(
      '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
      size, color
    );
  },

  refresh(size = 16, color = 'currentColor') {
    return this.svg(
      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
      size, color
    );
  },

  camera(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      size, color
    );
  },

  fileText(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
      size, color
    );
  },

  checkCircle(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      size, color, 2.2
    );
  },

  xCircle(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      size, color, 2.2
    );
  },

  star(size = 16, color = 'currentColor') {
    return this.svg(
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      size, color
    );
  },

  briefcase(size = 16, color = 'currentColor') {
    return this.svg(
      '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
      size, color
    );
  },

  coins(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="M16.7 13.3c.4.3.7.8.7 1.3 0 1.1-.9 2-2 2h-1"/>',
      size, color
    );
  },

  cart(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      size, color
    );
  },

  clipboard(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      size, color
    );
  },

  award(size = 16, color = 'currentColor') {
    return this.svg(
      '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
      size, color
    );
  },

  rocket(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
      size, color
    );
  },

  newspaper(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
      size, color
    );
  },

  megaphone(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
      size, color
    );
  },

  eye(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
      size, color
    );
  },

  eyeOff(size = 16, color = 'currentColor') {
    return this.svg(
      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
      size, color
    );
  },

  lock(size = 16, color = 'currentColor') {
    return this.svg(
      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      size, color
    );
  },

  unlock(size = 16, color = 'currentColor') {
    return this.svg(
      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
      size, color
    );
  },

  copy(size = 16, color = 'currentColor') {
    return this.svg(
      '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      size, color
    );
  }
};

export default Icons;

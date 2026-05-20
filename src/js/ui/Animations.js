/**
 * Animations.js - Lightweight UI Animations (v2)
 * Uses Web Animations API (native browser, zero dependencies).
 * Replaces Chart.js and heavy animation libraries.
 */

const DEFAULT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Count up/down a numeric value in an element
 * @param {HTMLElement} el - Target element
 * @param {number} from - Starting value
 * @param {number} to - Ending value
 * @param {number} duration - Duration in ms
 * @param {Function} formatter - Optional number formatter
 */
export function countUp(el, from, to, duration = 600, formatter = null) {
    if (!el) return;
    const startTime = performance.now();
    const diff = to - from;

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + diff * eased);
        el.textContent = formatter ? formatter(current) : current.toLocaleString('id-ID');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/**
 * Pulse an element once (for number updates, claim actions, etc.)
 * @param {HTMLElement} el
 * @param {string} color - Optional highlight color
 */
export function pulseElement(el, color = null) {
    if (!el) return;
    const keyframes = color
        ? [
            { transform: 'scale(1)', backgroundColor: 'transparent' },
            { transform: 'scale(1.04)', backgroundColor: color },
            { transform: 'scale(1)', backgroundColor: 'transparent' }
          ]
        : [
            { transform: 'scale(1)', opacity: '1' },
            { transform: 'scale(1.05)', opacity: '0.85' },
            { transform: 'scale(1)', opacity: '1' }
          ];

    el.animate(keyframes, { duration: 350, easing: DEFAULT_EASING });
}

/**
 * Fade in an element
 * @param {HTMLElement} el
 * @param {number} duration
 */
export function fadeIn(el, duration = 250) {
    if (!el) return;
    el.animate(
        [{ opacity: '0' }, { opacity: '1' }],
        { duration, easing: DEFAULT_EASING, fill: 'forwards' }
    );
}

/**
 * Fade out an element
 * @param {HTMLElement} el
 * @param {number} duration
 */
export function fadeOut(el, duration = 200) {
    if (!el) return;
    return el.animate(
        [{ opacity: '1' }, { opacity: '0' }],
        { duration, easing: DEFAULT_EASING, fill: 'forwards' }
    ).finished;
}

/**
 * Slide element in from the right
 * @param {HTMLElement} el
 * @param {number} duration
 */
export function slideInFromRight(el, duration = 280) {
    if (!el) return;
    el.animate(
        [
            { transform: 'translateX(32px)', opacity: '0' },
            { transform: 'translateX(0)', opacity: '1' }
        ],
        { duration, easing: DEFAULT_EASING }
    );
}

/**
 * Slide element in from the left
 * @param {HTMLElement} el
 * @param {number} duration
 */
export function slideInFromLeft(el, duration = 280) {
    if (!el) return;
    el.animate(
        [
            { transform: 'translateX(-32px)', opacity: '0' },
            { transform: 'translateX(0)', opacity: '1' }
        ],
        { duration, easing: DEFAULT_EASING }
    );
}

/**
 * Fade + slide up (for cards appearing on load)
 * @param {HTMLElement} el
 * @param {number} delay - Stagger delay in ms
 */
export function fadeUp(el, delay = 0) {
    if (!el) return;
    el.animate(
        [
            { transform: 'translateY(16px)', opacity: '0' },
            { transform: 'translateY(0)', opacity: '1' }
        ],
        { duration: 320, delay, easing: DEFAULT_EASING, fill: 'backwards' }
    );
}

/**
 * Stagger fade-up for a list of elements
 * @param {NodeList|Array} elements
 * @param {number} staggerMs - Delay between each item
 */
export function staggerFadeUp(elements, staggerMs = 60) {
    elements.forEach((el, i) => fadeUp(el, i * staggerMs));
}

/**
 * View transition: swap two view panels with a directional slide
 * @param {HTMLElement} fromEl - Outgoing view
 * @param {HTMLElement} toEl - Incoming view
 * @param {'left'|'right'} direction
 */
export function swipeTransition(fromEl, toEl, direction = 'right') {
    const inX = direction === 'right' ? '24px' : '-24px';

    // Bring in the new panel
    if (toEl) {
        toEl.style.display = '';
        toEl.animate(
            [
                { transform: `translateX(${inX})`, opacity: '0' },
                { transform: 'translateX(0)', opacity: '1' }
            ],
            { duration: 240, easing: DEFAULT_EASING }
        );
    }
}

/**
 * Shimmer skeleton loading effect on an element
 * @param {HTMLElement} el
 */
export function shimmer(el) {
    if (!el) return;
    el.classList.add('shimmer-loading');
    return () => el.classList.remove('shimmer-loading');
}

/**
 * Create a premium floating text effect (e.g. +$10,000) over an element
 * @param {HTMLElement} el - Element to float over
 * @param {string} text - Floating text content
 * @param {string} color - Text color
 */
export function createFloatingText(el, text, color = '#10b981') {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const floating = document.createElement('div');
    floating.textContent = text;
    floating.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top}px;
        transform: translate(-50%, -100%);
        color: ${color};
        font-weight: 900;
        font-size: 1.5rem;
        pointer-events: none;
        z-index: 9999;
        font-family: var(--font-family, inherit);
        text-shadow: 0 0 10px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(floating);

    floating.animate([
        { transform: 'translate(-50%, -100%) scale(0.8)', opacity: '0' },
        { transform: 'translate(-50%, -150%) scale(1.1)', opacity: '1', offset: 0.2 },
        { transform: 'translate(-50%, -250%) scale(1)', opacity: '0' }
    ], {
        duration: 1200,
        easing: 'cubic-bezier(0.25, 1, 0.50, 1)'
    }).finished.then(() => floating.remove());
}

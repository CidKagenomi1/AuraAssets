/**
 * SecurityUtils.js - Security Hardening & XSS Sanitization
 * Escapes untrusted text before insertion into innerHTML or template literals.
 */

/**
 * Escapes HTML characters (&, <, >, ", ') in dynamic content
 * to eliminate Cross-Site Scripting (XSS) injection vectors.
 * 
 * @param {string|number|null|undefined} value 
 * @returns {string} Safe HTML-escaped string
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize plain text strings for attribute values
 * @param {string|number|null|undefined} value 
 * @returns {string}
 */
export function sanitizeAttr(value) {
  return escapeHtml(value);
}

export default {
  escapeHtml,
  sanitizeAttr
};


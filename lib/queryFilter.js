// SPDX-License-Identifier: GPL-2.0-or-later
// Decides whether a search query should trigger a dictionary lookup.

const PREFIX_RE = /^(?:define|def|d)\s+(\S+)$/i;
const WORD_RE = /^[\p{L}][\p{L}'-]*$/u;

/**
 * @param {string[]} terms  search terms from the shell
 * @param {{mode?: 'any'|'prefix'}} opts
 * @returns {string|null} the word to look up, or null
 */
export function wordFromTerms(terms, {mode = 'any'} = {}) {
  const query = terms.join(' ').trim();
  const m = PREFIX_RE.exec(query);
  if (m && WORD_RE.test(m[1])) return m[1].toLowerCase();
  if (mode === 'prefix') return null;
  if (query.length < 2 || query.length > 40) return null;
  return WORD_RE.test(query) ? query.toLowerCase() : null;
}

// Pure parsing of `dict -f` output. No GNOME dependencies so it can be
// unit-tested under plain gjs.

const HEADER_RE = /^(\S+)\t(\d+)\t(\S+)\t(.*)$/;
const SENSE_RE = /^\s+(?:(n|v|adj|adv|s)\s+)?(\d+): (.*)$/;
const SYN_RE = /\s*\[syn: ([^\]]*)\]/;

function stripBraces(s) {
  return s.replace(/[{}]/g, '').trim();
}

function parseSynonyms(text) {
  const m = SYN_RE.exec(text);
  if (!m) return {text, synonyms: []};
  const synonyms = m[1].split(/\},\s*\{/).map(stripBraces).filter(Boolean);
  return {text: text.replace(SYN_RE, '').trim(), synonyms};
}

// Splits a WordNet gloss into definition + quoted examples.
function splitGloss(gloss) {
  const idx = gloss.indexOf('; "');
  if (idx === -1) return {definition: gloss.trim(), examples: []};
  const examples = [...gloss.slice(idx + 2).matchAll(/"([^"]*)"/g)].map(m => m[1]);
  return {definition: gloss.slice(0, idx).trim(), examples};
}

function parseWordNetBody(lines) {
  const senses = [];
  let headword = '';
  let pos = '';
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const flat = cur.raw.join(' ').replace(/\s+/g, ' ').trim();
    const {text, synonyms} = parseSynonyms(flat);
    const {definition, examples} = splitGloss(text);
    senses.push({pos: cur.pos, n: cur.n, definition, examples, synonyms});
    cur = null;
  };
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = SENSE_RE.exec(line);
    if (m) {
      flush();
      if (m[1]) pos = m[1];
      cur = {pos, n: Number(m[2]), raw: [m[3]]};
    } else if (!headword && /^ {1,3}\S/.test(line)) {
      headword = line.trim();
    } else if (cur) {
      cur.raw.push(line.trim());
    }
  }
  flush();
  return {headword, senses};
}

/**
 * @param {string} text  stdout of `dict -f ...`
 * @param {number} status  exit code of dict
 * @returns {{found: boolean, entries: Array, suggestions: string[]}}
 */
export function parseDictOutput(text, status = 0) {
  const lines = text.split('\n');
  const noMatch = /^No definitions found/.test(lines[0] ?? '');
  const result = {found: false, entries: [], suggestions: []};

  if (noMatch || status === 20 || status === 21) {
    const seen = new Set();
    for (const line of lines) {
      const m = HEADER_RE.exec(line);
      if (m && !seen.has(m[4])) {
        seen.add(m[4]);
        result.suggestions.push(m[4]);
      }
    }
    return result;
  }

  let cur = null;
  for (const line of lines) {
    const m = HEADER_RE.exec(line);
    if (m) {
      cur = {db: m[3], dbName: m[4], lines: []};
      result.entries.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }

  result.entries = result.entries.map(e => {
    const raw = e.lines.join('\n').replace(/\s+$/, '');
    const base = {db: e.db, dbName: e.dbName, raw};
    if (e.db === 'wn') return {...base, ...parseWordNetBody(e.lines)};
    return {...base, headword: '', senses: []};
  });
  result.found = result.entries.length > 0;
  return result;
}

export function formatSense(s) {
  return `${s.pos ? s.pos + '. ' : ''}${s.definition}`;
}

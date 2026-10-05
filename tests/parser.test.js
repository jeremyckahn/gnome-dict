// SPDX-License-Identifier: GPL-2.0-or-later
// Run with: gjs -m tests/parser.test.js
import GLib from 'gi://GLib';
import {parseDictOutput} from '../lib/parser.js';

const dir = GLib.path_get_dirname(import.meta.url.replace('file://', ''));
const read = n => new TextDecoder().decode(GLib.file_get_contents(`${dir}/fixtures/${n}.txt`)[1]);

let failed = 0;
function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    failed++;
    print(`FAIL: ${msg}\n  got:      ${JSON.stringify(a)}\n  expected: ${JSON.stringify(b)}`);
  } else print(`ok: ${msg}`);
}

let r = parseDictOutput(read('serendipity'), 0);
eq(r.found, true, 'serendipity found');
eq(r.entries.length, 1, 'one dictionary');
eq(r.entries[0].db, 'wn', 'db is wn');
eq(r.entries[0].headword, 'serendipity', 'headword');
eq(r.entries[0].senses[0].pos, 'n', 'pos');
eq(r.entries[0].senses[0].definition, 'good luck in making unexpected and fortunate discoveries', 'definition');

r = parseDictOutput(read('run'), 0);
const wn = r.entries.find(e => e.db === 'wn');
eq(wn.senses[0].pos, 'n', 'run: first pos');
eq(wn.senses[0].synonyms, ['run', 'tally'], 'run: synonyms');
eq(wn.senses[0].examples.length, 2, 'run: examples');
eq(wn.senses[1].n, 2, 'run: second sense number');
eq(wn.senses.some(s => s.pos === 'v'), true, 'run: has verb senses');

r = parseDictOutput(read('nomatch'), 20);
eq([r.found, r.suggestions], [false, []], 'no match');

r = parseDictOutput(read('suggest'), 21);
eq([r.found, r.suggestions], [false, ['serendipity']], 'suggestions');

r = parseDictOutput(read('set'), 0);
eq(r.entries.every(e => e.raw.length > 0), true, 'set: raw bodies present');

if (failed) { print(`${failed} failed`); imports.system.exit(1); }
print('all passed');

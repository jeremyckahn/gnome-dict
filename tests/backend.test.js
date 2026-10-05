// SPDX-License-Identifier: GPL-2.0-or-later
// Run with: gjs -m tests/backend.test.js  (needs a working `dict`)
import GLib from 'gi://GLib';
import {DictBackend} from '../lib/backend.js';
import {wordFromTerms} from '../lib/queryFilter.js';

let failed = 0;
const check = (c, m) => { print(`${c ? 'ok' : 'FAIL'}: ${m}`); if (!c) failed++; };

check(wordFromTerms(['Serendipity']) === 'serendipity', 'single word');
check(wordFromTerms(['define', 'run']) === 'run', 'define prefix');
check(wordFromTerms(['2+2']) === null, 'math ignored');
check(wordFromTerms(['two', 'words']) === null, 'multi-word ignored');
check(wordFromTerms(['run'], {mode: 'prefix'}) === null, 'prefix mode');

const loop = new GLib.MainLoop(null, false);
const b = new DictBackend({database: 'wn'});
(async () => {
  try {
    const r = await b.define('serendipity');
    check(r.found && r.entries[0].senses.length === 1, 'backend finds serendipity');
    const s = await b.define('serendipty');
    check(!s.found && s.suggestions.includes('serendipity'), 'backend suggests');
  } catch (e) { print(e); failed++; }
  loop.quit();
})();
loop.run();
if (failed) imports.system.exit(1);
print('all passed');

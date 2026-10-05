// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {parseDictOutput} from './parser.js';

const TIMEOUT_SECS = 2;
const MAX_CACHED = 200;

export class DictBackend {
  constructor({database = '*', localOnly = true} = {}) {
    this._database = database;
    this._localOnly = localOnly;
    this._cache = new Map();
  }

  configure(opts) {
    // An empty database name would make `dict -d ''` fail on every lookup.
    this._database = opts.database?.trim() || '*';
    this._localOnly = opts.localOnly ?? this._localOnly;
    this._cache.clear();
  }

  /** @returns {Promise<ReturnType<typeof parseDictOutput>>} */
  async define(word, cancellable = null) {
    const key = `${this._database}:${word}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const argv = ['dict', '-f', '-d', this._database];
    if (this._localOnly) argv.push('-h', 'localhost');
    argv.push('--', word);

    const proc = new Gio.Subprocess({
      argv,
      flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE,
    });
    proc.init(cancellable);

    const timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, TIMEOUT_SECS, () => {
      proc.force_exit();
      return GLib.SOURCE_REMOVE;
    });
    // communicate_async's cancellable stops the read but leaves the child
    // running, so kill it explicitly when the search is superseded.
    const cancelledId = cancellable?.connect(() => proc.force_exit()) ?? 0;
    try {
      const [, stdout] = await new Promise((resolve, reject) => {
        proc.communicate_utf8_async(null, cancellable, (p, res) => {
          try { resolve(p.communicate_utf8_finish(res)); } catch (e) { reject(e); }
        });
      });
      const status = proc.get_if_exited() ? proc.get_exit_status() : -1;
      if (status !== 0 && status !== 20 && status !== 21) {
        throw new Error(status === -1
          ? `dict timed out after ${TIMEOUT_SECS}s`
          : `dict exited with status ${status}`);
      }
      const parsed = parseDictOutput(stdout ?? '', status);
      this._cache.set(key, parsed);
      if (this._cache.size > MAX_CACHED)
        this._cache.delete(this._cache.keys().next().value);
      return parsed;
    } finally {
      if (cancelledId) cancellable.disconnect(cancelledId);
      GLib.source_remove(timeout);
    }
  }
}

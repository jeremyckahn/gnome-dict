// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DictBackend} from './lib/backend.js';
import {wordFromTerms} from './lib/queryFilter.js';
import {formatSense} from './lib/parser.js';
import {DefinitionResult, SuggestionResult} from './lib/resultWidget.js';

const MAX_SUGGESTIONS = 3;
const SUGGEST_PREFIX = 'suggest:';
const MAX_REMEMBERED_RESULTS = 50;

class DictSearchProvider {
  constructor(extension) {
    this._settings = extension.getSettings();
    this._backend = new DictBackend();
    this._results = new Map();
    this._lastError = null;
    this._syncSettings();
    this._settingsId = this._settings.connect('changed', () => this._syncSettings());

    this.id = extension.uuid;
    this.appInfo = {
      get_name: () => 'Dictionary',
      get_icon: () => new Gio.ThemedIcon({name: 'accessories-dictionary-symbolic'}),
      should_show: () => true,
    };
    this.canLaunchSearch = false;
    this.isRemoteProvider = false;
  }

  _syncSettings() {
    this._backend.configure({
      database: this._settings.get_string('database'),
      localOnly: this._settings.get_boolean('local-only'),
    });
  }

  destroy() {
    this._settings.disconnect(this._settingsId);
    this._settings = null;
  }

  async getInitialResultSet(terms, cancellable) {
    if (!this._settings) return [];
    const word = wordFromTerms(terms, {mode: this._settings.get_string('trigger-mode')});
    if (!word) return [];
    try {
      const parsed = await this._backend.define(word, cancellable);
      if (!this._settings) return [];
      this._lastError = null;
      if (parsed.found) {
        this._remember(word, {word, parsed});
        return [word];
      }
      return parsed.suggestions.slice(0, MAX_SUGGESTIONS).map(s => {
        const id = SUGGEST_PREFIX + s;
        this._remember(id, {suggestion: s});
        return id;
      });
    } catch (e) {
      if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
        // Log each distinct failure once, not on every keystroke.
        if (e.message !== this._lastError) logError(e);
        this._lastError = e.message;
      }
      return [];
    }
  }

  // Keeps the result map from growing with every keystroke; evicts oldest first.
  _remember(id, value) {
    this._results.delete(id);
    this._results.set(id, value);
    if (this._results.size > MAX_REMEMBERED_RESULTS)
      this._results.delete(this._results.keys().next().value);
  }

  getSubsearchResultSet(_previous, terms, cancellable) {
    return this.getInitialResultSet(terms, cancellable);
  }

  filterResults(results, max) {
    const limit = results[0]?.startsWith(SUGGEST_PREFIX) ? MAX_SUGGESTIONS : 1;
    return results.slice(0, Math.min(max, limit));
  }

  async getResultMetas(ids) {
    const createIcon = size => new St.Icon({
      icon_name: 'accessories-dictionary-symbolic', width: size, height: size,
    });
    return ids.filter(id => this._results.has(id)).map(id => {
      const r = this._results.get(id);
      if (r.suggestion)
        return {id, name: r.suggestion, suggestion: r.suggestion, createIcon};
      const summary = this._summarize(r.parsed);
      return {
        id,
        name: r.word,
        description: summary,
        // The shell copies this to the clipboard when the result is activated.
        clipboardText: `${r.word}\n${summary}`,
        definition: {
          entries: r.parsed.entries,
          maxSenses: this._settings.get_int('max-senses'),
        },
        createIcon,
      };
    });
  }

  _summarize(parsed) {
    const max = this._settings.get_int('max-senses');
    const wn = parsed.entries.find(e => e.senses.length);
    if (wn) return wn.senses.slice(0, max).map(s => `${s.n}. ${formatSense(s)}`).join('\n');
    const body = parsed.entries[0].raw.split('\n').map(l => l.trim()).filter(Boolean);
    return body.slice(0, 3).join(' ');
  }

  createResultObject(meta) {
    const view = Main.overview.searchController._searchResults;
    return meta.suggestion
      ? new SuggestionResult(this, meta, view)
      : new DefinitionResult(this, meta, view);
  }

  activateResult() {}
}

export default class DictExtension extends Extension {
  enable() {
    this._provider = new DictSearchProvider(this);
    Main.overview.searchController.addProvider(this._provider);
  }

  disable() {
    Main.overview.searchController.removeProvider(this._provider);
    this._provider.destroy();
    this._provider = null;
  }
}

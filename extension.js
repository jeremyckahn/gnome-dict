import Gio from 'gi://Gio';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DictBackend} from './lib/backend.js';
import {wordFromTerms} from './lib/queryFilter.js';
import {formatSense} from './lib/parser.js';

class DictSearchProvider {
  constructor(extension) {
    this._settings = extension.getSettings();
    this._backend = new DictBackend();
    this._results = new Map();
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
    const word = wordFromTerms(terms, {mode: this._settings.get_string('trigger-mode')});
    if (!word) return [];
    try {
      const parsed = await this._backend.define(word, cancellable);
      if (!parsed.found) return [];
      this._results.set(word, {word, parsed});
      return [word];
    } catch (e) {
      if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) logError(e);
      return [];
    }
  }

  getSubsearchResultSet(_previous, terms, cancellable) {
    return this.getInitialResultSet(terms, cancellable);
  }

  filterResults(results, max) {
    return results.slice(0, Math.min(max, 1));
  }

  async getResultMetas(ids) {
    return ids.filter(id => this._results.has(id)).map(id => {
      const {word, parsed} = this._results.get(id);
      return {
        id,
        name: word,
        description: this._summarize(parsed),
        createIcon: size => new St.Icon({
          icon_name: 'accessories-dictionary-symbolic',
          width: size, height: size,
        }),
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

  activateResult(id) {
    const {word} = this._results.get(id) ?? {};
    if (!word) return;
    const clipboard = St.Clipboard.get_default();
    clipboard.set_text(St.ClipboardType.CLIPBOARD, this._summarize(this._results.get(id).parsed));
    Main.overview.hide();
  }
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

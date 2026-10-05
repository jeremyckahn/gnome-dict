import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const TRIGGER_MODES = ['any', 'prefix'];

export default class DictPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage({title: 'Dictionary', icon_name: 'accessories-dictionary-symbolic'});
    const group = new Adw.PreferencesGroup({title: 'Lookup'});
    page.add(group);

    const trigger = new Adw.ComboRow({
      title: 'Trigger',
      subtitle: 'When to look up a word',
      model: Gtk.StringList.new(['Any single word', 'Only "define <word>"']),
      selected: Math.max(0, TRIGGER_MODES.indexOf(settings.get_string('trigger-mode'))),
    });
    trigger.connect('notify::selected', () =>
      settings.set_string('trigger-mode', TRIGGER_MODES[trigger.selected]));
    group.add(trigger);

    const database = new Adw.EntryRow({title: 'Dictionary database (* = all, wn = WordNet; see `dict -D`)'});
    settings.bind('database', database, 'text', 0);
    group.add(database);

    const localOnly = new Adw.SwitchRow({
      title: 'Local dictd server only',
      subtitle: 'Avoid network lookups to the servers in /etc/dictd/dict.conf',
    });
    settings.bind('local-only', localOnly, 'active', 0);
    group.add(localOnly);

    const senses = new Adw.SpinRow({
      title: 'Senses shown in results',
      adjustment: new Gtk.Adjustment({lower: 1, upper: 10, step_increment: 1}),
    });
    settings.bind('max-senses', senses, 'value', 0);
    group.add(senses);

    window.add(page);
  }
}

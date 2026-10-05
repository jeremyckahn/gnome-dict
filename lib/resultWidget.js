// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SearchResult} from 'resource:///org/gnome/shell/ui/search.js';

const POS_NAMES = {n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', s: 'adjective'};

function wrappedLabel(text, styleClass) {
  const label = new St.Label({text, style_class: styleClass, x_expand: true});
  label.clutter_text.set_line_wrap(true);
  label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
  label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
  return label;
}

// A multi-line "definition card" shown in place of the default one-line row.
export const DefinitionResult = GObject.registerClass(
class DefinitionResult extends SearchResult {
  _init(provider, metaInfo, resultsView) {
    super._init(provider, metaInfo, resultsView);
    this.style_class = 'list-search-result dict-result';

    const {entries, maxSenses} = metaInfo.definition;
    const box = new St.BoxLayout({vertical: true, x_expand: true, style_class: 'dict-card'});
    this.set_child(box);

    const title = new St.Label({
      text: metaInfo.name,
      style_class: 'dict-headword',
      x_align: Clutter.ActorAlign.START,
    });
    box.add_child(title);
    this.label_actor = title;

    const primary = entries.find(e => e.senses.length) ?? null;
    if (primary) {
      let lastPos = null;
      for (const sense of primary.senses.slice(0, maxSenses)) {
        if (sense.pos && sense.pos !== lastPos) {
          box.add_child(new St.Label({
            text: POS_NAMES[sense.pos] ?? sense.pos,
            style_class: 'dict-pos',
            x_align: Clutter.ActorAlign.START,
          }));
          lastPos = sense.pos;
        }
        const row = new St.BoxLayout({style_class: 'dict-sense'});
        row.add_child(new St.Label({
          text: `${sense.n}.`,
          style_class: 'dict-sense-num',
          y_align: Clutter.ActorAlign.START,
        }));
        row.add_child(wrappedLabel(sense.definition, 'dict-sense-text'));
        box.add_child(row);
        if (sense.examples.length) {
          box.add_child(wrappedLabel(`“${sense.examples[0]}”`, 'dict-example'));
        }
      }
    } else if (entries.length) {
      const lines = entries[0].raw.split('\n').map(l => l.trim()).filter(Boolean);
      box.add_child(wrappedLabel(lines.slice(0, 6).join(' '), 'dict-sense-text'));
    }

    // Footer: source dictionary on the left, a quiet hint of what Enter does on the right.
    const footer = new St.BoxLayout({style_class: 'dict-footer', x_expand: true});
    footer.add_child(new St.Label({
      text: (primary ?? entries[0])?.dbName ?? '',
      style_class: 'dict-source',
      x_expand: true,
      x_align: Clutter.ActorAlign.START,
    }));
    footer.add_child(new St.Label({
      text: 'Enter to copy',
      style_class: 'dict-hint',
      x_align: Clutter.ActorAlign.END,
    }));
    box.add_child(footer);
  }

  // Activating needs no override: the base class copies metaInfo.clipboardText
  // and closes the overview.
});

// "Did you mean X?" row; activating re-runs the search with the suggestion
// and keeps the overview open.
export const SuggestionResult = GObject.registerClass(
class SuggestionResult extends SearchResult {
  _init(provider, metaInfo, resultsView) {
    super._init(provider, metaInfo, resultsView);
    this.style_class = 'list-search-result dict-result';
    const row = new St.BoxLayout({
      style_class: 'dict-suggestion',
      x_expand: true,
      x_align: Clutter.ActorAlign.START,
    });
    this.set_child(row);
    row.add_child(new St.Label({text: 'Did you mean', style_class: 'dict-sense-text'}));
    const word = new St.Label({text: metaInfo.suggestion, style_class: 'dict-suggestion-word'});
    row.add_child(word);
    row.add_child(new St.Label({text: '?', style_class: 'dict-sense-text'}));
    this.label_actor = word;
  }

  activate() {
    Main.overview.searchEntry.set_text(this.metaInfo.suggestion);
  }
});

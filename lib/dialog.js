// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

const POS_NAMES = {n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', s: 'adjective'};

function wrapped(text, styleClass) {
  const label = new St.Label({text, style_class: styleClass, x_expand: true});
  label.clutter_text.set_line_wrap(true);
  label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
  return label;
}

/**
 * Full-entry popup: every dictionary that had a match, with clickable
 * synonyms and a Copy button.
 */
export class DefinitionDialog {
  /**
   * @param {{word: string, entries: Array, clipboardText: string}} def
   * @param {{onLookup: (word: string) => void, copy: (text: string) => void}} actions
   */
  constructor(def, {onLookup, copy}) {
    this._dialog = new ModalDialog.ModalDialog({
      styleClass: 'dict-dialog',
      destroyOnClose: true,
    });
    const layout = this._dialog.contentLayout;
    layout.add_child(new St.Label({text: def.word, style_class: 'dict-headword'}));

    const scroll = new St.ScrollView({
      style_class: 'dict-dialog-scroll',
      overlay_scrollbars: true,
      x_expand: true,
      y_expand: true,
    });
    const body = new St.BoxLayout({vertical: true, x_expand: true, style_class: 'dict-card'});
    scroll.set_child(body);
    layout.add_child(scroll);

    for (const entry of def.entries) {
      body.add_child(new St.Label({text: entry.dbName, style_class: 'dict-source-header'}));
      if (entry.senses.length)
        this._addSenses(body, entry, onLookup);
      else
        body.add_child(wrapped(entry.raw.replace(/^ {2}/gm, ''), 'dict-raw'));
    }

    this._dialog.addButton({
      label: 'Copy',
      action: () => copy(def.clipboardText),
    });
    this._dialog.addButton({
      label: 'Close',
      action: () => this.close(),
      default: true,
      key: Clutter.KEY_Escape,
    });
  }

  _addSenses(body, entry, onLookup) {
    let lastPos = null;
    for (const sense of entry.senses) {
      if (sense.pos && sense.pos !== lastPos) {
        body.add_child(new St.Label({
          text: POS_NAMES[sense.pos] ?? sense.pos,
          style_class: 'dict-pos',
        }));
        lastPos = sense.pos;
      }
      const row = new St.BoxLayout({style_class: 'dict-sense'});
      row.add_child(new St.Label({
        text: `${sense.n}.`,
        style_class: 'dict-sense-num',
        y_align: Clutter.ActorAlign.START,
      }));
      row.add_child(wrapped(sense.definition, 'dict-sense-text'));
      body.add_child(row);

      for (const ex of sense.examples)
        body.add_child(wrapped(`“${ex}”`, 'dict-example'));

      const syns = sense.synonyms.filter(s => s !== entry.headword);
      if (syns.length) {
        const synRow = new St.BoxLayout({
          style_class: 'dict-synonyms',
          x_align: Clutter.ActorAlign.START,
        });
        synRow.add_child(new St.Label({
          text: 'synonyms:', style_class: 'dict-example', y_align: Clutter.ActorAlign.CENTER,
        }));
        for (const syn of syns.slice(0, 6)) {
          const btn = new St.Button({label: syn, style_class: 'list-search-result dict-synonym', can_focus: true});
          btn.connect('clicked', () => {
            this.close();
            onLookup(syn);
          });
          synRow.add_child(btn);
        }
        body.add_child(synRow);
      }
    }
  }

  open() {
    this._dialog.open();
  }

  close() {
    this._dialog.close();
  }
}

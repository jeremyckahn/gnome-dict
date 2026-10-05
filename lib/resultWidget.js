import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

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
    this.style_class = 'dict-result';

    const {entries, maxSenses} = metaInfo.definition;
    const box = new St.BoxLayout({vertical: true, x_expand: true, style_class: 'dict-card'});
    this.set_child(box);

    const title = new St.Label({text: metaInfo.name, style_class: 'dict-headword'});
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

    const source = (primary ?? entries[0])?.dbName;
    if (source)
      box.add_child(new St.Label({text: source, style_class: 'dict-source'}));
  }
});

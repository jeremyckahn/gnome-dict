# Contributing

## Setup

```bash
sudo apt install gjs dict dictd dict-wn dict-gcide
make test      # parser + backend tests
make install   # compile schemas, copy into ~/.local/share/gnome-shell/extensions
```

`make install` copies files, so rerun it after every change. GNOME Shell caches
extension modules, so on Wayland you must **log out and back in** to load new
code. `make nested` runs `gnome-shell --nested --wayland` in a window to avoid
that; it needs a graphical session and has not been verified on every setup.

## Architecture

```
Activities search
  └─ DictSearchProvider            extension.js
       ├─ wordFromTerms            lib/queryFilter.js  which queries trigger a lookup
       ├─ DictBackend              lib/backend.js      async `dict -f`, cache, 2s timeout
       │    └─ parseDictOutput     lib/parser.js       pure parsing (WordNet senses, suggestions)
       ├─ DefinitionResult         lib/resultWidget.js card shown in search results
       ├─ SuggestionResult         lib/resultWidget.js "Did you mean…" row
       └─ DefinitionDialog         lib/dialog.js       full-entry popup
prefs.js                           preferences window (separate process; no Shell imports)
```

- `lib/parser.js`, `lib/queryFilter.js` and `lib/backend.js` import no Shell
  modules, so they are testable with plain `gjs`.
- Never run `dict` synchronously — that freezes the whole desktop. Use
  `Gio.Subprocess` with an argv array (no shell string) and a cancellable.
- `dict` writes "no match" messages and suggestions to **stderr**; the backend
  merges stderr into stdout. Exit codes: 0 found, 20 no match, 21 suggestions.
- `resultWidget.js` and `extension.js` rely on GNOME Shell 46 internals
  (`ui/search.js`, `searchController._searchResults`). Re-check them against
  the Shell source when adding support for a new version.

## Testing

```bash
make test
```

Tests live in `tests/`; `tests/fixtures/` holds recorded `dict -f` output.
To add a case, record real output (`dict -f word > tests/fixtures/word.txt`)
and assert on the parsed result. The Shell UI has no automated tests —
verify by hand in a real session and watch `journalctl -f /usr/bin/gnome-shell`.
Looking Glass (`Alt+F2`, `lg`) is useful for inspecting actors.

## Conventions

- ES modules, 2-space indent, single quotes.
- Every source file starts with `SPDX-License-Identifier: GPL-2.0-or-later`.
- Clean up everything in `disable()` (signals, timeouts, widgets) — required
  by extensions.gnome.org review.
- Keep commits focused; update `CHANGELOG.md` for user-visible changes.

# gnome-dict

Spotlight-style dictionary lookups for GNOME Shell. Type a word into Activities
search and see its definition inline, backed by the local `dict` CLI (`dictd`).

**Status:** early. Search provider and card confirmed working in a live shell;
the popup, suggestions and prefs are newly added. Targets GNOME Shell 46 (Ubuntu 24.04).

## How it works

A GNOME Shell extension registers a search provider. For a single-word query
(or `define <word>`) it runs `dict -f` asynchronously (2s timeout, cached),
parses the output (WordNet senses, synonyms, examples; raw text for other
dictionaries) and shows the first senses as the result. Activating the result
copies the definition.

## Develop

```bash
sudo apt install dictd dict dict-wn dict-gcide gjs
make test      # parser + backend tests under gjs
make install   # compile schemas, copy to ~/.local/share/gnome-shell/extensions
```

Then log out/in (Wayland) and run
`gnome-extensions enable gnome-dict@jeremyckahn.github.io`.

## Features

- Styled definition card in Activities search (headword, part of speech, senses, example)
- Enter/click opens a popup with every dictionary's entry, clickable synonyms and a Copy button
- "Did you mean…" suggestions for misspellings (click to re-search)
- Preferences window (trigger mode, database, local-only, senses shown)

Only the non-GUI code has automated tests; the shell UI is verified by hand.

# gnome-dict

Spotlight-style dictionary lookups for GNOME Shell. Type a word into Activities
search and see its definition inline, backed by the local `dict` CLI (`dictd`).

**Status:** early. Parser, backend and search provider are written and the
non-GUI parts are tested; the extension itself has not yet been exercised in a
live GNOME Shell. Targets GNOME Shell 46 (Ubuntu 24.04).

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

## Roadmap

- ~~Rich result card~~ done (untested in the live shell)
- Full-entry popup with all dictionaries, copy button, clickable synonyms
- "Did you mean…" suggestions (backend already returns them)
- Preferences UI (`prefs.js`) for the existing GSettings keys

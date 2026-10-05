# Releasing and publishing

## 1. Pre-flight

- `make test` passes and the extension has been tried in a real GNOME Shell session.
- `metadata.json`: bump `version-name`, and keep `shell-version` limited to
  versions you have actually tested. (`version` is an integer that
  extensions.gnome.org assigns on upload — don't add it.)
- Update `CHANGELOG.md`, commit, and tag: `git tag v0.1.0 && git push --tags`.

## 2. Build the bundle

```bash
make zip
```

This runs `gnome-extensions pack` and writes
`dist/gnome-dict@jeremyckahn.github.io.shell-extension.zip`. Check the listing
it prints: only `metadata.json`, `extension.js`, `prefs.js`, `stylesheet.css`,
`lib/` and `schemas/` should be inside — no tests, fixtures or dev files.

Test the exact zip before uploading:

```bash
gnome-extensions install --force dist/gnome-dict@jeremyckahn.github.io.shell-extension.zip
```

## 3. Publish on extensions.gnome.org

1. Sign in at <https://extensions.gnome.org/accounts/login/> (create an account first).
2. Go to <https://extensions.gnome.org/upload/> and upload the zip.
3. The extension is queued for **manual review** by volunteers (days to weeks).
   Check its status under "My extensions". Reviewers leave comments you
   answer by uploading a fixed version.
4. Once approved it appears in search and can be installed from the website
   (needs the GNOME Shell integration / `gnome-browser-connector`) or via the
   Extension Manager app.

Updates: bump `version-name`, rebuild, and upload again; every version is
reviewed. To support a new GNOME release, test on it, add it to `shell-version`
and upload a new version.

### Review guidelines to check before uploading

Full list: <https://gjs.guide/extensions/review-guidelines/review-guidelines.html>.
The ones most relevant here:

- Must be GPL-compatible (we use GPL-2.0-or-later) — the `LICENSE` file is included in the repo.
- `disable()` must undo everything `enable()` did (signals, timeouts, widgets).
- No synchronous subprocesses; spawn external tools with an argv array.
  The extension calls the external `dict` binary — mention this in the upload
  description (it's in `metadata.json`) and be ready to explain it if asked.
- No obfuscated/minified code, no bundled binaries, no unnecessary files.
- `prefs.js` must not import Shell code; `extension.js` must not import Gtk/Adw.
- The UUID must use a namespace you control (`jeremyckahn.github.io` here).

## 4. Other distribution channels

- **GitHub Releases:** attach the zip to the tag so people can use
  `gnome-extensions install`. Example:
  `gh release create v0.1.0 dist/*.zip --notes-file CHANGELOG.md`
- **Source install:** `make install` (see README).

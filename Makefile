UUID := gnome-dict@jeremyckahn.github.io
DEST := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: test schemas install uninstall nested zip
test:
	gjs -m tests/parser.test.js
	gjs -m tests/backend.test.js

schemas:
	glib-compile-schemas schemas/

install: schemas
	mkdir -p $(DEST)
	cp -r metadata.json extension.js prefs.js stylesheet.css lib schemas $(DEST)/
	@echo "Installed. Log out/in (Wayland) or use 'make nested' to try it."

uninstall:
	rm -rf $(DEST)

nested: install
	dbus-run-session gnome-shell --nested --wayland  # needs a graphical session

# Builds the bundle to upload to extensions.gnome.org (see docs/RELEASING.md).
zip:
	mkdir -p dist
	gnome-extensions pack --force \
		--schema=schemas/org.gnome.shell.extensions.gnome-dict.gschema.xml \
		--extra-source=lib --extra-source=stylesheet.css --extra-source=prefs.js \
		--out-dir=dist .
	@unzip -l dist/$(UUID).shell-extension.zip

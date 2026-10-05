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
	cp -r metadata.json extension.js lib schemas $(DEST)/
	@echo "Installed. Log out/in (Wayland) or use 'make nested' to try it."

uninstall:
	rm -rf $(DEST)

nested: install
	dbus-run-session gnome-shell --nested --wayland  # needs a graphical session

zip: schemas
	zip -r $(UUID).zip metadata.json extension.js lib schemas -x 'schemas/gschemas.compiled'

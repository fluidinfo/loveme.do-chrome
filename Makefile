zip:
	git archive --prefix=lovemedo-extension/ -v --format zip HEAD > lovemedo-extension.zip

clean:
	find . -name '*~' | xargs -r rm
	rm -f lovemedo-extension.zip

wc:
	@wc -l \
	    background.js \
	    content.js \
	    context.js \
	    domains/domains.js \
	    domains/oreilly.com.js \
	    domains/parse.js \
	    domains/radar.oreilly.com.js \
	    domains/sportsdirect.com.js \
	    domains/telegraph.co.uk.js \
	    fancy-settings/i18n.js \
	    fancy-settings/manifest.js \
	    fancy-settings/settings.js \
	    fluidinfo.js \
	    global.js \
	    iframe.js \
	    notification.js \
	    omnibox.js \
	    shortcut.js \
	    sidebar.js \
	    tagValueHandler.js \
	    values.js

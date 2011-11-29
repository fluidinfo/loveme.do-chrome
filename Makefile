zip:
	git archive --prefix=fluidinfo-extension/ -v --format zip HEAD > fluidinfo-extension.zip

clean:
	find . -name '*~' | xargs -r rm
	rm fluidinfo-extension.zip

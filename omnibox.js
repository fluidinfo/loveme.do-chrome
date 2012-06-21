chrome.omnibox.setDefaultSuggestion({
    description: 'Jump to "%s" in Fluidinfo'
});

chrome.omnibox.onInputEntered.addListener(function(about){
    chrome.tabs.getSelected(null, function(tab){
        chrome.tabs.update(tab.id, {
            url: 'http://' + fluidinfoHost + '/about/' + encodeURIComponent(about)
        });
    });
});

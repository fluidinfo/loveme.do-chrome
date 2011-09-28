// Listen for messages from the background page.
chrome.extension.onRequest.addListener(
    function(about, sender, sendResponse) {
        location.href = 'http://new.fluidinfo.com/about/' + encodeURIComponent(about);
    }
);

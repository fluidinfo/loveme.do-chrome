function getClickHandler() {
    return function(info, tab) {
        chrome.tabs.sendRequest(
          tab.id,
          info.selectionText,
          function(what){ console.msg('Received response: ' + what); }
          );
    };
};

// A context menu item for viewing the selection in Fluidinfo.
chrome.contextMenus.create({
    'title' : 'View in Fluidinfo Thing Engine.',
    'type' : 'normal',
    'contexts' : ['selection'],
    'onclick' : getClickHandler()
});

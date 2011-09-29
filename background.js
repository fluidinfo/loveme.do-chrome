function getClickHandlerNewTab() {
  return function(info, tab){
    var about = 'fluidinfo.com';
    if (info.selectionText){
      about = info.selectionText;
    } else if (info.linkUrl){
      about = info.linkUrl;
    } else if (info.srcUrl){
      about = info.srcUrl;
    };
    chrome.tabs.create({
      url: 'http://new.fluidinfo.com/about/' + encodeURIComponent(about),
      index: tab.index + 1
    });
  };
};

// A context menu item for viewing the selection in Fluidinfo in a new tab.
chrome.contextMenus.create({
    'title' : 'View in Fluidinfo Thing Engine',
    'type' : 'normal',
    'contexts' : ['all'],
    'onclick' : getClickHandlerNewTab()
});

/*
 * Let's put the functionality to use the existing tab into the user's
 * prefs at some point.
 *

function getClickHandlerRedirect() {
 return function(info, tab) {
 chrome.tabs.update(
 tab.id,
 { url: 'http://new.fluidinfo.com/about/' + encodeURIComponent(info.selectionText) }
 );
 };
};

// A context menu item for viewing the selection in Fluidinfo in the same tab.
chrome.contextMenus.create({
 'title' : 'View in Fluidinfo Thing Engine (this tab)',
 'type' : 'normal',
 'contexts' : ['selection'],
 'onclick' : getClickHandlerRedirect()
});

 *
 *
 */

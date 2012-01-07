var base = 'http://fluidinfo.com/about/';
var product = 'Fluidinfo';
var defaultAbout = '@fluidinfo';

// --------------------------- Page action --------------------------

chrome.tabs.onSelectionChanged.addListener(
  function(tabId) {
    chrome.pageAction.show(tabId);
  }
);

chrome.tabs.onUpdated.addListener(
  function(tabId) {
    chrome.pageAction.show(tabId);
  }
);

chrome.tabs.getSelected(
  null,
  function(tab) {
    chrome.pageAction.show(tab.id);
  }
);

chrome.pageAction.onClicked.addListener(
  function(tab) {
    chrome.tabs.create({
      url: base + '#!/' + encodeURIComponent(tab.url),
      index: tab.index + 1
    });
  }
);

// ----------------- Utility functions for context menus -----------------

function openNewTab(about, info, tab){
  /*
   * Create a new tab with the object browser looking at the given about value.
   */
  chrome.tabs.create({
    url: makeURL(about === undefined ? defaultAbout : about, info),
    index: tab.index + 1
  });
}

function makeURL(about, info){
  /*
   * Generate an object browser URL given an about value and an info
   * object containing information about the user event.
   */
  var fragment = refererFragment(info);
  if (fragment === ''){
    return base + '#!/' + encodeURIComponent(about);
  }
  else {
    return base + '?' + fragment + '#!/' + encodeURIComponent(about);
  }
}

function refererFragment(info){
  /*
   * A utility function to produce a url=xxx refering page URL fragment for a
   * request to the object browser.
   */
  return info.pageUrl ? 'url=' + encodeURIComponent(info.pageUrl) : '';
}

// --------------------------- Selection --------------------------

chrome.contextMenus.create({
    'title' : product + ' for "%s"',
    'type' : 'normal',
    'contexts' : ['selection'],
    'onclick' : function(info, tab){
        openNewTab(info.selectionText.toLowerCase(), info, tab);
    }
});

// --------------------------- Page --------------------------

chrome.contextMenus.create({
    'title' : product + ' for this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openNewTab(info.pageUrl, info, tab);
    }
});

// --------------------------- Link --------------------------

chrome.contextMenus.create({
    'title' : product + ' for this link',
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : function(info, tab){
        openNewTab(info.linkUrl, info, tab);
    }
});

// --------------------------- Link Text ---------------------

// This value will be overwritten each time the user moves over a link, so
// the initial value is just a throwaway.
var currentLinkText = '@fludidinfo';

var linkTextMenuItem = chrome.contextMenus.create({
    'title' : product + ' for link text',
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : function(info, tab){
        openNewTab(currentLinkText, info, tab);
    }
});

// The current lowercase value, and the value of the lowercase menu item, if any.
var currentLowercaseLinkText = '@fludidinfo';
var lowercaseLinkTextMenuItem;

var createLowerCaseLinkTextMenuItem = function(text){
    return chrome.contextMenus.create({
        'title' : product + ' for "' + text + '"',
        'type' : 'normal',
        'contexts' : ['link'],
        'onclick' : function(info, tab){
            openNewTab(currentLowercaseLinkText, info, tab);
        }
    });
};

// Listen for incoming messages with new link text, and update our currentLinkText
// variable as well as the context menu title for the link text. Add a context menu
// item for the lowercase string too, if it's not the same as the link text.
chrome.extension.onConnect.addListener(function(port){
    if (port.name === 'linktext'){
        port.onMessage.addListener(function(msg){
            currentLinkText = msg.text;
            chrome.contextMenus.update(linkTextMenuItem, {
                title: product + ' for "' + currentLinkText + '"'});
            var lower = currentLinkText.toLowerCase();
            if (currentLinkText === lower){
                // We don't need a lowercase menu item.
                if (lowercaseLinkTextMenuItem !== undefined){
                    chrome.contextMenus.remove(lowercaseLinkTextMenuItem);
                    lowercaseLinkTextMenuItem = undefined;
                }
            }
            else {
                // We need a lower case menu item. So update the existing one
                // or create a new one.
                currentLowercaseLinkText = lower;
                if (lowercaseLinkTextMenuItem === undefined){
                    lowercaseLinkTextMenuItem = createLowerCaseLinkTextMenuItem(currentLowercaseLinkText);
                }
                else {
                    chrome.contextMenus.update(lowercaseLinkTextMenuItem, {
                        title: product + ' for "' + currentLowercaseLinkText + '"'});
                }
            }
        });
    }
});


// --------------------------- Image --------------------------

chrome.contextMenus.create({
    'title' : product + ' for this image',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        openNewTab(info.srcUrl, info, tab);
    }
});

// --------------------------- Frame --------------------------

chrome.contextMenus.create({
    'title' : product + ' for this frame',
    'type' : 'normal',
    'contexts' : ['frame'],
    'onclick' : function(info, tab){
        openNewTab(info.frameUrl, info, tab);
    }
});

var base = 'http://new.fluidinfo.com/about/';
var product = 'Fluidinfo Thing Engine';

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
      url: base + encodeURIComponent(tab.url),
      index: tab.index + 1
    });
  }
);

// --------------------------- Selection, Link, Page --------------------------

function getClickHandlerSelectionLinkOrPage() {
  return function(info, tab){
    var about = 'fluidinfo.com';
    if (info.selectionText){
      about = info.selectionText;
    } else if (info.linkUrl){
      about = info.linkUrl;
    } else if (info.pageUrl){
      about = info.pageUrl;
    };
    chrome.tabs.create({
      url: base + encodeURIComponent(about),
      index: tab.index + 1
    });
  };
};

chrome.contextMenus.create({
    'title' : 'View page URL in ' + product,
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : getClickHandlerSelectionLinkOrPage()
});

chrome.contextMenus.create({
    'title' : 'View selected text in ' + product,
    'type' : 'normal',
    'contexts' : ['selection'],
    'onclick' : getClickHandlerSelectionLinkOrPage()
});

chrome.contextMenus.create({
    'title' : 'View link URL in ' + product,
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : getClickHandlerSelectionLinkOrPage()
});

// --------------------------- Images --------------------------

function getClickHandlerImage() {
  return function(info, tab){
    var about = 'fluidinfo.com';
    if (info.srcUrl){
      about = info.srcUrl;
    };
    chrome.tabs.create({
      url: base + encodeURIComponent(about),
      index: tab.index + 1
    });
  };
};

chrome.contextMenus.create({
    'title' : 'View image URL in ' + product,
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : getClickHandlerImage()
});

// --------------------------- Frames --------------------------

function getClickHandlerFrame() {
  return function(info, tab){
    var about = 'fluidinfo.com';
    if (info.frameUrl){
      about = info.frameUrl;
    };
    chrome.tabs.create({
      url: base + encodeURIComponent(about),
      index: tab.index + 1
    });
  };
};

chrome.contextMenus.create({
    'title' : 'View frame URL in ' + product,
    'type' : 'normal',
    'contexts' : ['frame'],
    'onclick' : getClickHandlerFrame()
});


// --------------------------- Open in existing tab -------------------------

/*
 * Let's put the functionality to use the existing tab into the user's
 * prefs at some point.
 *

function getClickHandlerRedirect() {
 return function(info, tab) {
 chrome.tabs.update(
 tab.id,
 { url: base + encodeURIComponent(info.selectionText) }
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

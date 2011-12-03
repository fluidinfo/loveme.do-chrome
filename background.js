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
      url: base + encodeURIComponent(tab.url),
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
    return base + encodeURIComponent(about);
  }
  else {
    return base + encodeURIComponent(about) + '?' + fragment;
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

function getClickHandlerSelection() {
  return function(info, tab){
    openNewTab(info.selectionText, info, tab);
  };
}

chrome.contextMenus.create({
    'title' : product + ' for "%s"',
    'type' : 'normal',
    'contexts' : ['selection'],
    'onclick' : getClickHandlerSelection()
});

// --------------------------- Page --------------------------

function getClickHandlerPage() {
  return function(info, tab){
    openNewTab(info.pageUrl, info, tab);
  };
}

chrome.contextMenus.create({
    'title' : product + ' for this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : getClickHandlerPage()
});

// --------------------------- Link --------------------------

function getClickHandlerLink() {
  return function(info, tab){
    openNewTab(info.linkUrl, info, tab);
  };
}

chrome.contextMenus.create({
    'title' : product + ' for this link',
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : getClickHandlerLink()
});

// --------------------------- Image --------------------------

function getClickHandlerImage() {
  return function(info, tab){
    openNewTab(info.srcUrl, info, tab);
  };
}

chrome.contextMenus.create({
    'title' : product + ' for this image',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : getClickHandlerImage()
});

// --------------------------- Frame --------------------------

function getClickHandlerFrame() {
  return function(info, tab){
    openNewTab(info.frameUrl, info, tab);
  };
}

chrome.contextMenus.create({
    'title' : product + ' for this frame',
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
   {
     url: makeURL(about, info)
   });
  };
}

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

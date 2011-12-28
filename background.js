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

chrome.contextMenus.create({
    'title' : product + ' for link text',
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : function(info, tab){
        chrome.tabs.sendRequest(
            tab.id,
            {url: info.linkUrl},
            function(response){
                if (response.result && response.result.length){
                    // For now, just jump to text of first matching link.
                    openNewTab(response.result[0].toLowerCase(), info, tab);
                }
                else {
                    console.log('No response result or no matching link found.');
                }
            }
        );
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

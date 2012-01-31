var base = 'http://fluidinfo.com/about/';
var defaultAbout = '@fluidinfo';

var twitterURLRegex = /^https?:\/\/twitter.com/;
var possibleAtNameRegex = /^\w+$/;
var linkRegex = /^\w+:\/\//;

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
    'title' : 'Fluidinfo "%s"',
    'type' : 'normal',
    'contexts' : ['selection'],
    'onclick' : function(info, tab){
        openNewTab(info.selectionText.toLowerCase(), info, tab);
    }
});

// --------------------------- Page --------------------------

chrome.contextMenus.create({
    'title' : 'Fluidinfo for this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openNewTab(info.pageUrl, info, tab);
    }
});

// --------------------------- Link --------------------------

var linkMenuItem = chrome.contextMenus.create({
    'title' : 'Fluidinfo for this link',
    'type' : 'normal',
    'contexts' : ['link'],
    'onclick' : function(info, tab){
        openNewTab(info.linkUrl, info, tab);
    }
});

var updateLinkMenuItem = function(linkUrl, docURL){
    console.log('linkUrl = "' + linkUrl + '".');
    var url;
    if (linkRegex.test(linkUrl)){
        // The link looks absolute (i.e., http:// or https:// or ftp://).
        url = linkUrl;
    }
    else {
        // A relative link. Prepend the current document protocol & host+port.
        var parts = docURL.split('/');
        if (linkUrl.charAt(0) === '/'){
            url = parts[0] + '//' + parts[2] + linkUrl;
        }
        else {
            url = parts[0] + '//' + parts[2] + '/' + linkUrl;
        }
    }
    chrome.contextMenus.update(linkMenuItem, {
        title: 'Fluidinfo "' + url + '"'});
};

// --------------------------- Links and link text ------------

var linkTextMenuItems = {};

var addLinkTextMenuItem = function(text){
    text = (text.length < 25 ? text : text.slice(0, 22) + '...').replace(/\n+/g, ' ');
// console.log('adding "' + text + '".');
    if (typeof linkTextMenuItems[text] === 'undefined'){
        linkTextMenuItems[text] = chrome.contextMenus.create({
            'title' : 'Fluidinfo "' + text + '"',
            'type' : 'normal',
            'contexts' : ['link'],
            'onclick' : function(info, tab){
                openNewTab(text, info, tab);
            }
        });
    }
};

var clearLinkTextMenuItems = function(){
    for (text in linkTextMenuItems){
        if (typeof linkTextMenuItems[text] !== 'undefined'){
            chrome.contextMenus.remove(linkTextMenuItems[text]);
        }
    }
    linkTextMenuItems = {};
};


// Listen for incoming messages with link events (mouseover, mouseout), and
// update our various link context menu items.

chrome.extension.onConnect.addListener(function(port){
    if (port.name === 'linktext'){
        port.onMessage.addListener(function(msg){
            if (msg.mouseout){
                // The mouse moved off a link so clear all link menus.
                clearLinkTextMenuItems();
            }
            else {
                // The mouse moved over a link.
                updateLinkMenuItem(msg.linkURL, msg.docURL);
                clearLinkTextMenuItems(); // In case we somehow missed a mouseout event.
                // addLinkTextMenuItem(msg.linkURL);
                if (msg.text){
                    addLinkTextMenuItem(msg.text);
                    var lower = msg.text.toLowerCase();
                    addLinkTextMenuItem(lower);

                    // Check to see if we should add an @name menu item.
                    if (lower.charAt(0) !== '@' && lower.length <= 20 &&
                        possibleAtNameRegex.test(lower) && twitterURLRegex.test(msg.docURL)){
                        // We need an @name menu item. So update the existing one
                        // or create a new one.
                        addLinkTextMenuItem('@' + msg.text.toLowerCase());
                    }
                }
            }
        });
    }
});


// --------------------------- Image --------------------------

chrome.contextMenus.create({
    'title' : 'Fluidinfo for this image',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        openNewTab(info.srcUrl, info, tab);
    }
});

// --------------------------- Frame --------------------------

chrome.contextMenus.create({
    'title' : 'Fluidinfo for this frame',
    'type' : 'normal',
    'contexts' : ['frame'],
    'onclick' : function(info, tab){
        openNewTab(info.frameUrl, info, tab);
    }
});

// ------------------- Tagging (from the popup) ----------------

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse){
        if (request.action === 'validate'){
            var username = request.username;
            var password = request.password;
            if (!(username && password)){
                sendResponse({
                    message: 'Error: username or password were not passed.',
                    success: false
                });
                return;
            }
            var fi = fluidinfo({
                username: username,
                password: password
            });
            fi.api.get({
                path: ['users', username],
                onSuccess: function(response){
                    localStorage.username = username;
                    localStorage.password = password;
                    sendResponse({
                        success: true
                    });
                },
                onError: function(response){
                    sendResponse({
                        message: 'Authentication failed: ' + response.statusText + ' (status ' + response.status + ').',
                        success: false
                    });
                }
            });
        }
        else if (request.action === 'tag'){
            var username = localStorage.username;
            var password = localStorage.password;
            if (!(username && password)){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var fi = fluidinfo({
                username: username,
                password: password
            });
            var values = {};
            var tagName;
            for (tagName in request.tagNamesAndValues){
                var tagValue = request.tagNamesAndValues[tagName];
                if (typeof tagValue !== 'function'){
                    values[username + '/' + tagName] = tagValue;
                }
            }
            fi.update({
                where: 'fluiddb/about = "' + request.about + '"',
                values: values,
                onSuccess: function(response){
                    sendResponse({
                        success: true
                    });
                },
                onError: function(response){
                    console.log('Fluidinfo API call failed:');
                    console.log(response);
                    sendResponse({
                        message: 'Fluidinfo call failed: ' + response.statusText + ' (status ' + response.status + ').',
                        success: false
                    });
                }
            });
        }
    }
);

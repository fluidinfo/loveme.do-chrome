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

// --------------------------- Page --------------------------

chrome.contextMenus.create({
    'title' : 'Fluidinfo for this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openNewTab(info.pageUrl, info, tab);
    }
});


var absoluteHref = function(linkURL, docURL){
    /*
     * Turn a possibly relative linkURL (the href="" part of an <a> tag)
     * into something absolute. If linkURL does not specify a host, use
     * the one in the document's URL (given in docURL).
     */
    var url;
    if (linkRegex.test(linkURL)){
        // The link looks absolute (i.e., http:// or https:// or ftp://).
        url = linkURL;
    }
    else if (linkURL.slice(0, 7).toLowerCase() === 'mailto:'){
        url = linkURL.split(':')[1].toLowerCase();
    }
    else {
        // A relative link. Prepend the current document protocol & host+port.
        var parts = docURL.split('/');
        if (linkURL.charAt(0) === '/'){
            url = parts[0] + '//' + parts[2] + linkURL;
        }
        else {
            url = parts[0] + '//' + parts[2] + '/' + linkURL;
        }
    }

    return url;
};


// ---------------------- Link text context menu items ------------

// contextMenuItems has attributes that are the text of current
// context menu items. Its values are objects with two attributes,
// 'context' (either 'selection' or 'link') and 'menuItem', the menu
// item index returned by chrome.contextMenus.create.
var contextMenuItems = {};

var addContextMenuItem = function(text, context){
    // Add (possibly truncated) 'text' to the context menu, if not already present.
    text = (text.length < 50 ? text : text.slice(0, 47) + '...').replace(/\n+/g, ' ');
    if (typeof contextMenuItems[text] === 'undefined'){
        var menuItem = chrome.contextMenus.create({
            'title' : 'Fluidinfo "' + text + '"',
            'type' : 'normal',
            'contexts' : [context],
            'onclick' : function(info, tab){
                openNewTab(text, info, tab);
            }
        });
        contextMenuItems[text] = {
            context: context,
            menuItem: menuItem
        };
    }
};

var removeContextMenuItemsByContext = function(context){
    for (text in contextMenuItems){
        if (typeof contextMenuItems[text] !== 'undefined' &&
            contextMenuItems[text].context === context){
            chrome.contextMenus.remove(contextMenuItems[text].menuItem);
            delete contextMenuItems[text];
        }
    }
};


// Listen for incoming messages with events (link mouseover, link
// mouseout, selection set/cleared), and update the context menu.

chrome.extension.onConnect.addListener(function(port){
    if (port.name === 'context'){
        port.onMessage.addListener(function(msg){
            if (typeof msg.selection !== 'undefined'){
                removeContextMenuItemsByContext('selection');
                // Offer mixed & lower case versions.
                addContextMenuItem(msg.selection, 'selection');
                addContextMenuItem(msg.selection.toLowerCase(), 'selection');
            }
            else if (msg.selectionCleared){
                removeContextMenuItemsByContext('selection');
            }
            else if (msg.mouseout){
                // The mouse moved off a link so clear all link-related context
                // menu items.
                removeContextMenuItemsByContext('link');
            }
            else if (msg.mouseover){
                // The mouse moved over a new link. Remove existing link-related
                // context menu items.
                removeContextMenuItemsByContext('link');

                // There are <a> tags with no href in them.
                if (msg.linkURL){
                    var url = absoluteHref(msg.linkURL, msg.docURL);
                    addContextMenuItem(url, 'link');
                    // updateLinkMenuItem(msg.linkURL, msg.docURL);
                }

                // And there are <a> tags with no text in them.
                if (msg.text){
                    addContextMenuItem(msg.text, 'link');
                    var lower = msg.text.toLowerCase();
                    addContextMenuItem(lower, 'link');

                    // Check to see if we should add an @name menu item.
                    if (lower.charAt(0) !== '@' && lower.length <= 20 &&
                        possibleAtNameRegex.test(lower) && twitterURLRegex.test(msg.docURL)){
                        addContextMenuItem('@' + lower, 'link');
                    }
                }
            }
            else {
                console.log('Unrecognized message sent by content script:');
                console.log(msg);
            }
        });
    }
});


// --------------------------- Image --------------------------

chrome.contextMenus.create({
    'title' : 'Fluidinfo for the URL of this image',
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

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

var fluidinfoAPI;

var setFluidinfoAPIFromLocalStorage = function(){
    // Set the global fluidinfoAPI variable using credentials found in
    // local storage, if possible. If credentials cannot be found, do
    // nothing (callers can check fluidinfoAPI).
    var username = localStorage.username;
    var password = localStorage.password;
    if (username && password){
        fluidinfoAPI = fluidinfo({
            username: username,
            password: password
        });
    }
};

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
            fluidinfoAPI = fluidinfo({
                username: username,
                password: password
            });
            fluidinfoAPI.api.get({
                path: ['users', username],
                onSuccess: function(response){
                    localStorage.username = username;
                    localStorage.password = password;
                    sendResponse({
                        success: true
                    });
                },
                onError: function(response){
                    fluidinfoAPI = undefined;
                    sendResponse({
                        message: 'Authentication failed: ' + response.statusText + ' (status ' + response.status + ').',
                        success: false
                    });
                }
            });
        }
        else if (request.action === 'tag'){
            // Adds a tag to an arbitrary object (used by the popup to put the current
            // URL onto an object as a tag value).
            setFluidinfoAPIFromLocalStorage();
            if (fluidinfoAPI === undefined){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var username = localStorage.username;
            var values = {};
            var tagName;
            for (tagName in request.tagNamesAndValues){
                var tagValue = request.tagNamesAndValues[tagName];
                if (typeof tagValue !== 'function'){
                    values[username + '/' + tagName] = tagValue;
                }
            }
            fluidinfoAPI.update({
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
        else if (request.action === 'tag-current-url'){
            setFluidinfoAPIFromLocalStorage();
            if (fluidinfoAPI === undefined){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var username = localStorage.username;
            var tagNamesAndValues = {};
            var tagName;
            for (tagName in request.tagNamesAndValues){
                var tagValue = request.tagNamesAndValues[tagName];
                if (typeof tagValue !== 'function'){
                    tagNamesAndValues[username + '/' + tagName] = tagValue;
                }
            }
            valuesCache[request.tabId].valuesCache.set({
                onError: function(response){
                    console.log('Fluidinfo API call failed:');
                    console.log(response);
                    sendResponse({
                        message: 'Fluidinfo call failed: ' + response.statusText + ' (status ' + response.status + ').',
                        success: false
                    });
                },
                onSuccess: function(response){
                    sendResponse({
                        success: true
                    });
                },
                tagNamesAndValues: tagNamesAndValues
            });
        }
        else if (request.action === 'untag-current-url'){
            setFluidinfoAPIFromLocalStorage();
            if (fluidinfoAPI === undefined){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var username = localStorage.username;
            var tags = [];
            for (var i = 0; i < request.tags.length; i++){
                var tag = request.tags[i];
                tags.push(username + '/' + tag);
            }
            valuesCache[request.tabId].valuesCache.remove({
                onError: function(response){
                    console.log('Fluidinfo API call failed:');
                    console.log(response);
                    sendResponse({
                        message: 'Fluidinfo call failed: ' + response.statusText + ' (status ' + response.status + ').',
                        success: false
                    });
                },
                onSuccess: function(response){
                    sendResponse({
                        success: true
                    });
                },
                tags: tags
            });
        }
        else if (request.action === 'get-values-for-current-url'){
            setFluidinfoAPIFromLocalStorage();
            if (fluidinfoAPI === undefined){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }

            // Figure out what tags to retrieve, based on the list of tags we already
            // know are on the object. This avoids asking Fluidinfo for things we
            // already know don't exist.
            var username = localStorage.username;
            var tags = [];
            for (var i = 0; i < request.tags.length; i++){
                var tag = username + '/' + request.tags[i];
                if (valuesCache[request.tabId].tagPaths.hasOwnProperty(tag)){
                    tags.push(tag);
                }
            }

            if (tags.length === 0){
                // None of the wanted tags are on the object.
                sendResponse({
                    result: { data: {} },
                    success: true,
                    username: username
                });
            }
            else {
                valuesCache[request.tabId].valuesCache.get({
                    onError: function(response){
                        sendResponse({
                            message: 'Fluidinfo call failed: ' + response.statusText + ' (status ' + response.status + ').',
                            success: false
                        });
                    },
                    onSuccess: function(result){
                        sendResponse({
                            result: result,
                            success: true,
                            username: username
                        });
                    },
                    tags: tags
                });
            }
        }
    }
);

// -------------------- Tag values for current tab's URL --------------------

// valuesCache is keyed by tab id, values are objects with a tagValueHandler
// (as returned by makeTagValueHandler) and a JS object holding the tag paths
// on the object.
var valuesCache = {};
var notifications = {};

var createNotification = function(tabId){
    if (window.webkitNotifications){
        if (! notifications.hasOwnProperty(tabId)){
            var notification = window.webkitNotifications.createHTMLNotification('notification.html');
            notification.show();
            notification.onclose = function(){
                deleteNotificationForTab(tabId);
            };
            notifications[tabId] = notification;
        }
    }
    else {
        console.log("Notifications are not supported for this browser/OS version yet.");
    }
};

var deleteValuesCacheForTab = function(tabId){
    if (valuesCache[tabId] !== undefined){
        valuesCache[tabId].valuesCache.ignoreFutureResults();
        delete valuesCache[tabId];
    }
};

var deleteNotificationForTab = function(tabId){
    if (notifications[tabId] !== undefined){
        notifications[tabId].cancel();
        delete notifications[tabId];
    }
};

chrome.tabs.onRemoved.addListener(function(tabId, changeInfo, tab){
    deleteValuesCacheForTab(tabId);
    deleteNotificationForTab(tabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if (fluidinfoAPI === undefined){
        setFluidinfoAPIFromLocalStorage();
        if (fluidinfoAPI === undefined){
            console.log('Not fetching tags for URL. User is not logged in.');
            return;
        }
    }
    if (changeInfo.status === 'loading'){
        var url = tab.url;
        deleteValuesCacheForTab(tabId);
        deleteNotificationForTab(tabId);
        valuesCache[tabId] = {
            tagPaths: {}, // Will be filled in in onSuccess, below.
            valuesCache: makeTagValueHandler({
                about: url,
                session: fluidinfoAPI
            })
        };

        var onError = function(result){
            console.log('Got error from Fluidinfo fetching tags for URL ' + url);
            console.log(result);
        };

        var onSuccess = function(result){
            var username = localStorage.username;
            var tagPaths = result.data.tagPaths;
            var wantedTags = [];
            for (var i = 0; i < tagPaths.length; i++){
                var tagPath = tagPaths[i];
                valuesCache[tabId].tagPaths[tagPath] = true;
                var namespace = tagPath.slice(0, tagPath.indexOf('/'));
                if (namespace === username){
                    // This is one of the user's tags.
                    wantedTags.push(tagPath);
                }
            }

            if (wantedTags.length > 0){
                valuesCache[tabId].valuesCache.get({
                    onError: function(response){
                        console.log('Fluidinfo API call failed:');
                        console.log(response);
                        },
                    onSuccess: function(){
                        chrome.browserAction.setBadgeText({
                            tabId: tabId,
                            text: '' + wantedTags.length
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: [255, 0, 0, 255],
                            tabId: tabId
                        });

                        createNotification(tabId);
                        /*
                        var hide = function(){
                            deleteNotificationForTab(tabId);
                        };
                        // TODO: make the timing of the hiding of notifications an option,
                        // including no hiding at all.
                        setTimeout(hide, 30000);
                        */

                        var populate = function(){
                            var found = false;
                            chrome.extension.getViews({type: 'notification'}).forEach(function(win){
                                // Populate any new notification window (win._fluidinfo_tabId undefined)
                                // or re-populate if win._fluidinfo_tabId is the current tabId (in which
                                // case we are processing a reload).
                                if (win._fluidinfo_tabId === undefined || win._fluidinfo_tabId === tabId){
                                    if (win.populate){
                                        win.populate({
                                            url: url,
                                            valuesCache: valuesCache[tabId].valuesCache,
                                            wantedTags: wantedTags
                                        });
                                        win._fluidinfo_tabId = tabId;
                                        found = true;
                                    }
                                }
                            });

                            if (!found){
                                setTimeout(populate, 50);
                            }
                        };

                        setTimeout(populate, 50);
                    },
                    tags: wantedTags
                });
            }
            else {
                // The user has no tags on this URL.
                chrome.browserAction.setBadgeText({
                    tabId: tabId,
                    text: ''
                });
                chrome.browserAction.setBadgeBackgroundColor({
                    color: [0, 0, 0, 255],
                    tabId: tabId
                });
            }
        };

        // Pull back tag paths on the object for the current URL.
        fluidinfoAPI.api.get({
            path: ['about', url],
            onError: onError,
            onSuccess: onSuccess
        });
    }
});

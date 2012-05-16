var base = 'http://fluidinfo.com/about/';
var defaultAbout = '@fluidinfo';
var twitterUserURLRegex = new RegExp('^https?://twitter.com/#!/(\\w+)$');
var linkRegex = /^\w+:\/\//;

var currentSelection = null;
var tabThatCreatedCurrentSelection = null;
var maxSelectionLengthToLookup = 200;

// Things we consider as possibly being an about value that corresponds to
// something that's being followed, e.g., '@username' or 'wordnik.com'.
var followeeRegex = /^@?([\w\.]+)$/;

// -----------------  Settings, creds, Fluidinfo API -----------------

var settings = new Store('settings', {
    notificationTimeout: 30,
    sidebarSide: 'left',
    sidebarWidth: 300
});

var anonFluidinfoAPI = fluidinfo();

var fluidinfoAPI = null;
var fluidinfoUsername = null;

var validateCredentials = function(options){
    var username = settings.get('username');
    var password = settings.get('password');

    if (!(username && password)){
        fluidinfoAPI = fluidinfoUsername = null;
        options.onError && options.onError('Username and password are not both set.');
    }
    else {
        username = username.toLowerCase();
        fluidinfoAPI = fluidinfo({
            username: username,
            password: password
        });
        fluidinfoAPI.api.get({
            path: ['users', username],
            onSuccess: function(response){
                fluidinfoUsername = username;
                options.onSuccess && options.onSuccess(response);
            },
            onError: function(response){
                fluidinfoAPI = fluidinfoUsername = null;
                options.onError && options.onError(response);
            }
        });
    }
};

// Perform an immediate check for credentials from any persisted settings.
validateCredentials({});

// -----------------  Omnibox -----------------

chrome.omnibox.setDefaultSuggestion({
    description: 'Jump to "%s" in Fluidinfo'
});

chrome.omnibox.onInputEntered.addListener(function(text){
    chrome.tabs.getSelected(null, function(tab){
        chrome.tabs.update(tab.id, {
            url: makeURL(text)
        });
    });
});

chrome.omnibox.onInputChanged.addListener(function(text, suggest){
    if (fluidinfoUsername &&
            ((text === fluidinfoUsername.slice(0, text.length)) ||
             (text.charAt(0) === '@' && text.slice(1) === fluidinfoUsername.slice(0, text.length - 1)))){
        // The user may be typing their username or @username, so suggest it.
        var prefix = text.slice(text.charAt(0) === '@' ? 1 : 0);
        suggest([
            {
                content: '@' + fluidinfoUsername,
                description: ('Jump to <match>@' + prefix + '</match>' +
                              fluidinfoUsername.slice(prefix.length) + ' in Fluidinfo')
            }
        ]);
    }
});

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
    var fragment = info ? refererFragment(info) : '';
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
    'title' : 'Go to this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openNewTab(info.pageUrl, info, tab);
    }
});

chrome.contextMenus.create({
    'title' : 'Follow this page',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        addFollow(info.pageUrl);
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
// 'context' (either 'link' or 'selection') and 'menuItem',
// the menu item index returned by chrome.contextMenus.create.
var contextMenuItems = {};

var addContextMenuItem = function(text, context){
    // Add (possibly truncated) 'text' to the context menu, if not already present.
    text = (text.length < 50 ? text : text.slice(0, 47) + '...').replace(/\n+/g, ' ');

    if (typeof contextMenuItems[text] === 'undefined'){
        var gotoMenuItem = chrome.contextMenus.create({
            'title' : 'Go to ' + text,
            'type' : 'normal',
            'contexts' : [context],
            'onclick' : function(info, tab){
                openNewTab(text, info, tab);
            }
        });
        var followMenuItem = chrome.contextMenus.create({
            'title' : 'Follow ' + text,
            'type' : 'normal',
            'contexts' : [context],
            'onclick' : function(info, tab){
                addFollow(text);
            }
        });
        contextMenuItems[text] = {
            context: context,
            followMenuItem: followMenuItem,
            gotoMenuItem: gotoMenuItem
        };
    }
};

var removeContextMenuItemsByContext = function(context){
    var text;
    for (text in contextMenuItems){
        if (typeof contextMenuItems[text] !== 'undefined' &&
            contextMenuItems[text].context === context){
            chrome.contextMenus.remove(contextMenuItems[text].gotoMenuItem);
            chrome.contextMenus.remove(contextMenuItems[text].followMenuItem);
            delete contextMenuItems[text];
        }
    }
};

var createSelectionNotification = function(about){
    displayNotification({
        about: about,
        tabId: 'selection',
        updateBadge: false
    });
};

var removeSelectionNotification = function(){
    deleteNotificationForTab('selection');
    tabThatCreatedCurrentSelection = null;
};


// Listen for incoming messages from the tab content script or the sidebar
// iframe script with events (link mouseover, link mouseout, selection
// set/cleared, etc).

chrome.extension.onConnect.addListener(function(port){
    if (port.name === 'content-script'){
        port.onMessage.addListener(function(msg){
            if (typeof msg.selection !== 'undefined'){
                if (currentSelection === null || msg.selection !== currentSelection){
                    chrome.tabs.getSelected(null, function(tab){
                        tabThatCreatedCurrentSelection = tab.id;
                        currentSelection = msg.selection;
                        removeContextMenuItemsByContext('selection');
                        addContextMenuItem(currentSelection, 'selection');
                        if (currentSelection.length < maxSelectionLengthToLookup){
                            createSelectionNotification(currentSelection);
                        }
                    });
                }
            }
            else if (msg.selectionCleared){
                if (currentSelection !== null){
                    currentSelection = null;
                    removeContextMenuItemsByContext('selection');
                    removeSelectionNotification();
                }
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
                
                var url;

                // There are <a> tags with no href in them.
                if (msg.linkURL){
                    url = absoluteHref(msg.linkURL, msg.docURL);
                    addContextMenuItem(url, 'link');
                }

                // And there are <a> tags with no text in them.
                if (msg.text){
                    if (msg.linkURL){
                        url = absoluteHref(msg.linkURL, msg.docURL);
                        var match = twitterUserURLRegex.exec(url);
                        if (match !== null){
                            // We can test against match[1] as the regexp captures the username,
                            // so if it matched, match[1] will always be defined.
                            var name = match[1];
                            var lower = name.toLowerCase();
                            if (lower !== 'following' && lower !== 'followers'){
                                // Update with @name
                                addContextMenuItem('@' + name, 'link');

                                // Look for "fullname @username" text.
                                var spaceAt = msg.text.indexOf(' @');
                                if (spaceAt !== -1){
                                    // Note that Twitter now put U-200F (RIGHT-TO-LEFT MARK) after
                                    // people's names, and we need to zap it. You'll know if this
                                    // creeps back in, as clicking on the link in the context menu
                                    // will take you to something ending in %E2%80%8F (the UTF-8
                                    // for that codepoint).
                                    var fullname = msg.text.slice(0, spaceAt).replace(/^\s+|[\s\u200F]+$/g, '');
                                    addContextMenuItem(fullname, 'link');
                                }
                            }

                            return;
                        }
                    }
                    addContextMenuItem(msg.text, 'link');
                }
            }
            else if (msg.injectSidebarJS){
                chrome.tabs.getSelected(null, function(tab){
                    chrome.tabs.executeScript(tab.id, {
                        allFrames: true,
                        file: 'sidebar-inject.js'
                    });
                });
            }
            else {
                console.log('Unrecognized message sent by content script:');
                console.log(msg);
            }
        });
    }
    else if (port.name === 'sidebar-iframe'){
        // Process messages coming from the sidebar iframe.
        port.onMessage.addListener(function(msg){
            chrome.tabs.getSelected(null, function(tab){
                var sidebarPort = chrome.tabs.connect(tab.id, {name: 'sidebar'});
                if (msg.action === 'hide sidebar'){
                    sidebarPort.postMessage({
                        action: 'hide sidebar'
                    });
                }
                else if (msg.action === 'open'){
                    chrome.tabs.update(tab.id, {
                        url: absoluteHref(msg.linkURL, msg.docURL)
                    });
                }
                else {
                    console.log('Unrecognized message sent by sidebar iframe:');
                    console.log(msg);
                }
            });
        });
    }
    else {
        console.log('Got connection on port with unknown name.');
        console.log(port);
    }
});


// --------------------------- Image --------------------------

chrome.contextMenus.create({
    'title' : 'Go to this image',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        openNewTab(info.srcUrl, info, tab);
    }
});

chrome.contextMenus.create({
    'title' : 'Follow this image',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        addFollow(info.srcUrl);
    }
});

// ------------------- Add tag ---------------------------------

var addTag = function(options){
    /*
     * Add tags to a Fluidinfo object.
     *
     * Options contains:
     *   about: the object the tag should be attached to.
     *   onError: function to call on any error, passing an error message.
     *   onSuccess: function to call on success, passing the Fluidinfo response.
     *   tagNamesAndValues: object mapping tag names to values.
     */

    if (!fluidinfoAPI){
        options.onError('Username and password are not set. Please log in (right-click the Fluidinfo icon).');
        return;
    }
    var about = valueUtils.lowercaseAboutValue(options.about);
    fluidinfoAPI.update({
        where: 'fluiddb/about = "' + valueUtils.quoteAbout(about) + '"',
        values: options.tagNamesAndValues,
        onSuccess: function(response){
            options.onSuccess && options.onSuccess(response);
        },
        onError: function(response){
            console.log('Fluidinfo API call failed:');
            console.log(response);
            options.onError && options.onError(
                'Fluidinfo call failed: ' + response.statusText + ' ' +
                '(status ' + response.status + ').');
        }
    });
};

var addFollow = function(toFollow){
    /*
     * Add a follows tag to the Fluidinfo with about = toFollow.
     */
    // No onError or onSuccess are added here as we're being called
    // from a context menu.
    var tagNamesAndValues = {};
    tagNamesAndValues[fluidinfoUsername + '/follows'] = null;
    addTag({
        about: toFollow,
        tagNamesAndValues: tagNamesAndValues
    });
};

// ------------------- Listen for requests.

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse){
        if (request.action === 'get-fluidinfo-username'){
            sendResponse(fluidinfoUsername);
        }
        else if (request.action === 'logout'){
            fluidinfoAPI = fluidinfoUsername = null;
        }
        else if (request.action === 'get-settings'){
            sendResponse(settings.toObject());
        }
        else if (request.action === 'update-current-tab-url'){
            // TODO: use me from the sidebar iframe.
            chrome.tabs.update(sender.tab.id, {
                url: request.url
            });
        }
        else if (request.action === 'validate-credentials'){
            validateCredentials({
                onError: function(response){
                    var message;
                    if (response.hasOwnProperty('status')){
                        message = ('Authentication failed: ' + response.statusText +
                                   ' (status ' + response.status + ').');
                    }
                    else {
                        message = response;
                    }
                    sendResponse({
                        message: message,
                        success: false
                    });
                },
                onSuccess: function(response){
                    sendResponse({
                        success: true
                    });
                }
            });
        }
        else if (request.action === 'tag'){
            addTag({
                about: request.about,
                onError: function(response){
                    sendResponse({
                        message: response,
                        success: false
                    });
                },
                onSuccess: function(response){
                    sendResponse({
                        success: true
                    });
                },
                tagNamesAndValues: request.tagNamesAndValues
            });
        }
        else if (request.action === 'tag-current-thing'){
            // Add tags to either the object for URL of the current page or (if there
            // is text selected) to the object for the selected text.
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var cacheItem = (currentSelection && currentSelection.length < maxSelectionLengthToLookup ?
                             'selection' : request.tabId);
            valuesCache[cacheItem].tagValueHandler.set({
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
                tagNamesAndValues: request.tagNamesAndValues
            });
        }
        else if (request.action === 'untag-current-thing'){
            // Remove tags from either the object for URL of the current page or (if there
            // is text selected) from the object for the selected text.
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var cacheItem = (currentSelection && currentSelection.length < maxSelectionLengthToLookup ?
                             'selection' : request.tabId);
            valuesCache[cacheItem].tagValueHandler.remove({
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
                tags: request.tags
            });
        }
        else if (request.action === 'get-existing-values-for-current-thing'){
            // Return our cache of tag values for either the object for URL of
            // the current page or (if there is text selected) for the object for
            // the selected text.
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
            }
            else {
                if (currentSelection && currentSelection.length < maxSelectionLengthToLookup){
                    var cacheItem = 'selection';
                    var about = currentSelection;
                }
                else {
                    var cacheItem = request.tab.id;
                    var about = request.tab.url;
                }
                sendResponse({
                    about: about,
                    success: true,
                    existingValues: valuesCache[cacheItem].tagValueHandler.cache
                });
            }
        }
        else {
            console.log('Unknown request received by background page:');
            console.log(request);
        }
    }
);

// -------------------- Tag values for current tab's URL --------------------

// valuesCache is keyed by tab id, values are objects with a tagValueHandler
// (as returned by makeTagValueHandler) and a JS object holding the tag paths
// on the object.
var valuesCache = {};

var deleteValuesCacheForTab = function(tabId){
    if (valuesCache[tabId] !== undefined){
        valuesCache[tabId].tagValueHandler.ignoreFutureResults();
        delete valuesCache[tabId];
    }
};

var notifications = {};
var timeouts = {};

var createNotification = function(tabId){
    if (window.webkitNotifications){
        if (! notifications[tabId]){
            var notification = window.webkitNotifications.createHTMLNotification('notification.html');
            notification.show();
            notifications[tabId] = notification;
            notification.onclose = function(){
                deleteNotificationForTab(tabId);
            };
        }
    }
    else {
        console.log("Notifications are not supported for this browser/OS version yet.");
    }
};

var deleteNotificationForTab = function(tabId){
    if (notifications[tabId] !== undefined){
        if (timeouts[tabId] !== undefined){
            clearTimeout(timeouts[tabId]);
            delete timeouts[tabId];
        }
        notifications[tabId].cancel();
        delete notifications[tabId];
    }
};

var displayNotification = function(options){
    var tabId = options.tabId;
    var about = options.about;
    var updateBadge = options.updateBadge;

    deleteValuesCacheForTab(tabId);
    deleteNotificationForTab(tabId);
    valuesCache[tabId] = {
        tagPaths: {}, // Will be filled in in onSuccess, below.
        tagValueHandler: makeTagValueHandler({
            about: about,
            session: anonFluidinfoAPI
        })
    };

    var onError = function(result){
        // Ignore 404 errors, which just indicate there are no tags for the object.
        if (result.status != 404){
            console.log('Got error from Fluidinfo fetching tags for about ' + about);
            console.log(result);
        }
    };

    var showFolloweeTags = function(result){
        var onError = function(result){
            if (result.status === 404 &&
                result.headers['X-FluidDB-Error-Class'] === 'TNonexistentTag' &&
                result.headers['X-FluidDB-Path'] === fluidinfoUsername + '/follows'){
                    // The user doesn't have a USERNAME/follows tag. No problem.
            }
            else {
                console.log('Got error from Fluidinfo fetching ' + fluidinfoUsername + '/follows tag.');
                console.log(result);
            }
        };

        var onSuccess = function(following){
            var followees = {};
            var i;

            // Get the name part of all about values that look like "@name"
            // or a domain, as these can be considered a user that this user
            // is following.
            var userIsFollowingSomething = false;
            var data = following.data;
            for (i = 0; i < data.length; i++){
                var match = followeeRegex.exec(data[i]['fluiddb/about']);
                if (match !== null){
                    var what = match[1].toLowerCase();
                    if (what !== fluidinfoUsername){
                        followees[what] = true;
                        userIsFollowingSomething = true;
                    }
                }
            }

            if (!userIsFollowingSomething){
                return;
            }

            // Look at the tags on the object and get the ones that have
            // namespaces that correspond to things the user is following
            // and that we know how to display in a custom way.
            var tagPaths = result.data.tagPaths;
            var neededTags = [];
            var knownPrefixes = [];
            var seenPrefixes = {};
            for (i = 0; i < tagPaths.length; i++){
                var tagPath = tagPaths[i];
                var namespace = tagPath.slice(0, tagPath.indexOf('/'));
                var namespaceWithSlash = namespace + '/';
                if (followees.hasOwnProperty(namespace) &&
                    customDisplayPrefixes.hasOwnProperty(namespaceWithSlash)){
                    // This is one of the anon user's followees tags, and we have a custom
                    // display function for it.
                    neededTags.push(tagPath);
                    if (!seenPrefixes.hasOwnProperty(namespaceWithSlash)){
                        knownPrefixes.push(namespaceWithSlash);
                        seenPrefixes[namespaceWithSlash] = true;
                    }
                }
            }

            if (knownPrefixes.length > 0 && neededTags.length > 0){
                valuesCache[tabId].tagValueHandler.get({
                    onError: function(response){
                        console.log('Fluidinfo API call failed:');
                        console.log(response);
                    },
                    onSuccess: function(){

                        createNotification(tabId, 'followees');

                        var timeout = settings.get('notificationTimeout');
                        if (timeout){
                            var hide = function(){
                                deleteNotificationForTab(tabId, 'followees');
                            };
                            if (! timeouts.hasOwnProperty(tabId)){
                                timeouts[tabId] = {};
                            }
                            timeouts[tabId] = setTimeout(hide, timeout * 1000);
                        }

                        var populate = function(){
                            var found = false;
                            var info = tabId + '_followees';
                            chrome.extension.getViews({type: 'notification'}).forEach(function(win){
                                // Populate any new notification window (win._fluidinfo_info undefined)
                                // or re-populate if win._fluidinfo_info is the current tabId (in which
                                // case we are processing a reload).
                                if (!found &&
                                    (win._fluidinfo_info === undefined || win._fluidinfo_info === info)){
                                    if (win.populate){
                                        win._fluidinfo_info = info;
                                        win.populate({
                                            about: about,
                                            knownPrefixes: knownPrefixes,
                                            tabId: (tabId === 'selection' ? tabThatCreatedCurrentSelection : tabId),
                                            tagValueHandler: valuesCache[tabId].tagValueHandler
                                        });
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
                    tags: neededTags
                });
            }
        };

        // Get the about values from the objects the anon user follows.
        anonFluidinfoAPI.query({
            select: ['fluiddb/about'],
            where: ['has anon/follows'],
            onError: onError,
            onSuccess: onSuccess
        });
    };

    var onSuccess = function(result){
        showFolloweeTags(result);
    };

    // Pull back tag paths on the object for the current about value. Do
    // this as the anonymous user to make sure we don't send identifying
    // info with lookups. Only publicly readable tags will be returned as
    // a result.
    anonFluidinfoAPI.api.get({
        path: ['about', valueUtils.lowercaseAboutValue(about)],
        onError: onError,
        onSuccess: onSuccess
    });
};

chrome.tabs.onRemoved.addListener(function(tabId, changeInfo, tab){
    deleteValuesCacheForTab(tabId);
    deleteNotificationForTab(tabId);
    if (tabId === tabThatCreatedCurrentSelection){
        removeSelectionNotification();
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if (changeInfo.status === 'loading'){
        displayNotification({
            about: tab.url,
            tabId: tabId,
            updateBadge: true
        });
        // Update the context menu to add the current page's domain if
        // the tab that's loading is the one that's currently being viewed.
        // I.e., ignore tabs which are auto-reloading or loading at startup
        // when the browser is restoring state.
        chrome.tabs.getCurrent(function(currentTab){
            // Note that currentTab is sometimes undefined.
            if (currentTab && currentTab.id === tabId){
                removeContextMenuItemsByContext('page');
                if (! valueUtils.isChromeURL(tab.url)){
                    var domain = valueUtils.extractDomainFromURL(tab.url);
                    addContextMenuItem(domain, 'page');
                }
            }
        });
    }
});

chrome.tabs.onActiveChanged.addListener(function(tabId, selectInfo){
    removeContextMenuItemsByContext('page');
    chrome.tabs.get(tabId, function(tab){
        if (! valueUtils.isChromeURL(tab.url)){
            var domain = valueUtils.extractDomainFromURL(tab.url);
            addContextMenuItem(domain, 'page');
        }
    });
});


// Inject our content scripts into existing tabs, skipping chrome's own
// tabs (trying to inject into them gives a console error message).

chrome.tabs.query({}, function(tabs){
    var files = ['shortcut.js', 'sidebar.js', 'content.js'];
    for (var i = 0; i < tabs.length; i++){
        var tab = tabs[i];
        if (! valueUtils.isChromeURL(tab.url)){
            for (var j = 0; j < files.length; j++){
                chrome.tabs.executeScript(tab.id, {
                    file: files[j]
                });
            }
        }
    }
});

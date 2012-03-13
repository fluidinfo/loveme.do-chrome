var base = 'http://fluidinfo.com/about/';
var defaultAbout = '@fluidinfo';
var twitterUserURLRegex = new RegExp('^https?://twitter.com/#!/(\\w+)$');
var linkRegex = /^\w+:\/\//;

var currentSelection = null;
var tabThatCreatedCurrentSelection = null;
var maxSelectionLengthToLookup = 200;

// Things we consider as possibly being an about value that's a
// corresponds to something that's being followed, e.g.,
// '@username' or 'wordnik.com'.
var followeeRegex = /^@?([\w\.]+)$/;

// -----------------  Settings, creds, Fluidinfo API -----------------

var settings = new Store('settings', {
    'notificationTimeout': 30
});

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

var addContextMenuItem = function(text, type, context){
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
    for (text in contextMenuItems){
        if (typeof contextMenuItems[text] !== 'undefined' &&
            contextMenuItems[text].context === context){
            chrome.contextMenus.remove(contextMenuItems[text].gotoMenuItem);
            chrome.contextMenus.remove(contextMenuItems[text].followMenuItem);
            delete contextMenuItems[text];
        }
    }
};

var createSelectionNotifications = function(about){
    displayNotifications({
        about: about,
        tabId: 'selection',
        updateBadge: false
    });
};

var removeSelectionNotifications = function(){
    deleteAllNotificationsForTab('selection');
    tabThatCreatedCurrentSelection = null;
};


// Listen for incoming messages from the content script with events
// (link mouseover, link mouseout, selection set/cleared), and
// update the context menu.

chrome.extension.onConnect.addListener(function(port){
    if (port.name === 'content-script'){
        port.onMessage.addListener(function(msg){
            if (typeof msg.selection !== 'undefined'){
                if (currentSelection === null || msg.selection !== currentSelection){
                    currentSelection = msg.selection;
                    removeContextMenuItemsByContext('selection');
                    addContextMenuItem(currentSelection, 'selection', 'selection');
                    if (currentSelection.length < maxSelectionLengthToLookup){
                        createSelectionNotifications(currentSelection);
                    }
                    chrome.tabs.getSelected(null, function(tab){
                        tabThatCreatedCurrentSelection = tab.id;
                    });
                }
            }
            else if (msg.selectionCleared){
                if (currentSelection !== null){
                    currentSelection = null;
                    removeContextMenuItemsByContext('selection');
                    removeSelectionNotifications();
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

                // There are <a> tags with no href in them.
                if (msg.linkURL){
                    var url = absoluteHref(msg.linkURL, msg.docURL);
                    addContextMenuItem(url, 'url', 'link');
                }

                // And there are <a> tags with no text in them.
                if (msg.text){
                    if (msg.linkURL){
                        var url = absoluteHref(msg.linkURL, msg.docURL);
                        var match = twitterUserURLRegex.exec(url);
                        if (match !== null){
                            // We can test against match[1] as the regexp captures the username,
                            // so if it matched, match[1] will always be defined.
                            var name = match[1];
                            var lower = name.toLowerCase();
                            if (lower !== 'following' && lower !== 'followers'){
                                // Update with @name
                                addContextMenuItem('@' + name, 'link-text', 'link');

                                // Look for "fullname @username" text.
                                var spaceAt = msg.text.indexOf(' @');
                                if (spaceAt !== -1){
                                    // Note that Twitter now put U-200F (RIGHT-TO-LEFT MARK) after
                                    // people's names, and we need to zap it. You'll know if this
                                    // creeps back in, as clicking on the link in the context menu
                                    // will take you to something ending in %E2%80%8F (the UTF-8
                                    // for that codepoint).
                                    var fullname = msg.text.slice(0, spaceAt).replace(/^\s+|[\s\u200F]+$/g, '');
                                    addContextMenuItem(fullname, 'link-text', 'link');
                                }
                            }

                            return;
                        }
                    }
                    addContextMenuItem(msg.text, 'link-text', 'link');
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
    var values = {};
    var tagName;
    for (tagName in options.tagNamesAndValues){
        var tagValue = options.tagNamesAndValues[tagName];
        if (typeof tagValue !== 'function'){
            values[fluidinfoUsername + '/' + tagName] = tagValue;
        }
    }
    var about = valueUtils.lowercaseAboutValue(options.about);
    fluidinfoAPI.update({
        where: 'fluiddb/about = "' + valueUtils.quoteAbout(about) + '"',
        values: values,
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
    addTag({
        about: toFollow,
        tagNamesAndValues: {
            follows: null
        }
    });
};

// ------------------- Tagging (from the popup) ----------------

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse){
        if (request.action === 'get-fluidinfoUsername'){
            sendResponse(fluidinfoUsername);
        }
        else if (request.action === 'logout'){
            fluidinfoAPI = fluidinfoUsername = null;
        }
        else if (request.action === 'validate-credentials'){
            validateCredentials({
                onError: function(response){
                    if (response.hasOwnProperty('status')){
                        var message = ('Authentication failed: ' + response.statusText +
                                       ' (status ' + response.status + ').');
                    }
                    else {
                        var message = response;
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
        else if (request.action === 'tag-current-url'){
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var tagNamesAndValues = {};
            var tagName;
            for (tagName in request.tagNamesAndValues){
                var tagValue = request.tagNamesAndValues[tagName];
                if (typeof tagValue !== 'function'){
                    tagNamesAndValues[fluidinfoUsername + '/' + tagName] = tagValue;
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
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }
            var tags = [];
            for (var i = 0; i < request.tags.length; i++){
                var tag = request.tags[i];
                tags.push(fluidinfoUsername + '/' + tag);
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
            if (!fluidinfoAPI){
                sendResponse({
                    message: 'Username and password are not set. Please log in (right-click the Fluidinfo icon).',
                    success: false
                });
                return;
            }

            // Figure out what tags to retrieve, based on the list of tags we already
            // know are on the object. This avoids asking Fluidinfo for things we
            // already know don't exist.
            var tags = [];
            if (valuesCache.hasOwnProperty(request.tabId)){
                for (var i = 0; i < request.tags.length; i++){
                    var tag = fluidinfoUsername + '/' + request.tags[i];
                    if (valuesCache[request.tabId].tagPaths.hasOwnProperty(tag)){
                        tags.push(tag);
                    }
                }
            }

            if (tags.length === 0){
                // None of the wanted tags are on the object.
                sendResponse({
                    fluidinfoUsername: fluidinfoUsername,
                    result: { data: {} },
                    success: true
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
                            fluidinfoUsername: fluidinfoUsername,
                            result: result,
                            success: true
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

var deleteValuesCacheForTab = function(tabId){
    if (valuesCache[tabId] !== undefined){
        valuesCache[tabId].valuesCache.ignoreFutureResults();
        delete valuesCache[tabId];
    }
};

var notifications = {};
var timeouts = {};

var createNotification = function(tabId, type){
    if (window.webkitNotifications){
        if (! notifications.hasOwnProperty(tabId)){
            notifications[tabId] = {};
        }

        if (! notifications[tabId].hasOwnProperty(type)){
            var notification = window.webkitNotifications.createHTMLNotification('notification.html');
            notification.show();
            notifications[tabId][type] = notification;
            notification.onclose = function(){
                deleteNotificationForTab(tabId, type);
            };
        }
    }
    else {
        console.log("Notifications are not supported for this browser/OS version yet.");
    }
};

var deleteAllNotificationsForTab = function(tabId){
    if (notifications[tabId] !== undefined){
        for (type in notifications[tabId]){
            if (notifications[tabId].hasOwnProperty(type)){
                deleteNotificationForTab(tabId, type);
            }
        }
    }
};

var deleteNotificationForTab = function(tabId, type){
    if (notifications[tabId] !== undefined){
        if (notifications[tabId][type] !== undefined){
            if (timeouts[tabId] !== undefined){
                if (timeouts[tabId][type] !== undefined){
                    clearTimeout(timeouts[tabId][type]);
                    delete timeouts[tabId][type];
                }
            }
            notifications[tabId][type].cancel();
            delete notifications[tabId][type];
        }
    }
};

var displayNotifications = function(options){
    // If the user isn't logged in, do nothing.
    if (!fluidinfoAPI){
        return;
    }
    var tabId = options.tabId;
    var about = options.about;
    var updateBadge = options.updateBadge;

    deleteValuesCacheForTab(tabId);
    deleteAllNotificationsForTab(tabId);
    valuesCache[tabId] = {
        tagPaths: {}, // Will be filled in in onSuccess, below.
        valuesCache: makeTagValueHandler({
            about: about,
            session: fluidinfoAPI
        })
    };

    var onError = function(result){
        console.log('Got error from Fluidinfo fetching tags for about ' + about);
        console.log(result);
    };

    var showUsersTags = function(result){
        var tagPaths = result.data.tagPaths;
        var wantedTags = [];
        for (var i = 0; i < tagPaths.length; i++){
            var tagPath = tagPaths[i];
            valuesCache[tabId].tagPaths[tagPath] = true;
            var namespace = tagPath.slice(0, tagPath.indexOf('/'));
            if (namespace === fluidinfoUsername){
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
                    if (updateBadge){
                        chrome.browserAction.setBadgeText({
                            tabId: tabId,
                            text: '' + wantedTags.length
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: [255, 0, 0, 255],
                            tabId: tabId
                        });
                    }

                    createNotification(tabId, 'user');

                    var timeout = settings.get('notificationTimeout');
                    if (timeout){
                        var hide = function(){
                            deleteNotificationForTab(tabId, 'user');
                        };
                        if (! timeouts.hasOwnProperty(tabId)){
                            timeouts[tabId] = {};
                        }
                        timeouts[tabId].user = setTimeout(hide, timeout * 1000);
                    }

                    var populate = function(){
                        var found = false;
                        var info = tabId + '_user';
                        chrome.extension.getViews({type: 'notification'}).forEach(function(win){
                            // Populate any new notification window (win._fluidinfo_info undefined)
                            // or re-populate if win._fluidinfo_info is the current tabId (in which
                            // case we are processing a reload).
                            if (!found &&
                                (win._fluidinfo_info === undefined || win._fluidinfo_info === info)){
                                if (win.populate){
                                    win._fluidinfo_info = info;
                                    win.populate({
                                        dropNamespaces: true,
                                        title: 'Your info for',
                                        about: about,
                                        valuesCache: valuesCache[tabId].valuesCache,
                                        wantedTags: wantedTags
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
                tags: wantedTags
            });
        }
        else {
            // The user has no tags on the object for the current about value.
            if (updateBadge){
                chrome.browserAction.setBadgeText({
                    tabId: tabId,
                    text: ''
                });
                chrome.browserAction.setBadgeBackgroundColor({
                    color: [0, 0, 0, 255],
                    tabId: tabId
                });
            }
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
            // as these can be considered a user that this user is following.
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

            // Look at the tags on the object and get the ones that have namespaces
            // that correspond to things the user is following.
            var tagPaths = result.data.tagPaths;
            var wantedTags = [];
            for (i = 0; i < tagPaths.length; i++){
                var tagPath = tagPaths[i];
                var namespace = tagPath.slice(0, tagPath.indexOf('/'));
                if (followees.hasOwnProperty(namespace)){
                    // This is one of the user's followees tags.
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

                        createNotification(tabId, 'followees');

                        var timeout = settings.get('notificationTimeout');
                        if (timeout){
                            var hide = function(){
                                deleteNotificationForTab(tabId, 'followees');
                            };
                            if (! timeouts.hasOwnProperty(tabId)){
                                timeouts[tabId] = {};
                            }
                            timeouts[tabId].followees = setTimeout(hide, timeout * 1000);
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
                                            dropNamespaces: false,
                                            title: 'People you follow have added info to',
                                            about: about,
                                            valuesCache: valuesCache[tabId].valuesCache,
                                            wantedTags: wantedTags
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
                    tags: wantedTags
                });
            }
        };

        // Get the about values from the objects the user follows.
        fluidinfoAPI.query({
            select: ['fluiddb/about'],
            where: ['has ' + fluidinfoUsername + '/follows' ],
            onError: onError,
            onSuccess: onSuccess
        });
    };

    var onSuccess = function(result){
        showUsersTags(result);
        showFolloweeTags(result);
    };

    // Pull back tag paths on the object for the current about value.
    fluidinfoAPI.api.get({
        path: ['about', valueUtils.lowercaseAboutValue(about)],
        onError: onError,
        onSuccess: onSuccess
    });
};

chrome.tabs.onRemoved.addListener(function(tabId, changeInfo, tab){
    deleteValuesCacheForTab(tabId);
    deleteAllNotificationsForTab(tabId);
    if (tabId === tabThatCreatedCurrentSelection){
        removeSelectionNotifications();
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if (changeInfo.status === 'loading'){
        displayNotifications({
            about: tab.url,
            tabId: tabId,
            updateBadge: true
        });
    }
});


// Inject our content script into existing tabs, skipping chrome's own
// tabs (trying to inject into them gives a console error message).

chrome.tabs.query({}, function(tabs){
    for (var i = 0; i < tabs.length; i++){
        var tab = tabs[i];
        if (tab.url.slice(0, 9) !== 'chrome://' &&
            tab.url.slice(0, 18) !== 'chrome-devtools://'){
            chrome.tabs.executeScript(tab.id, {
                file: 'content.js'
            });
        }
    }
});

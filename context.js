// --------------------------- Page --------------------------

chrome.contextMenus.create({
    'title' : 'This page in the sidebar',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openInSidebar(info.pageUrl, info, tab);
    }
});

chrome.contextMenus.create({
    'title' : 'This page on loveme.do',
    'type' : 'normal',
    'contexts' : ['page'],
    'onclick' : function(info, tab){
        openNewTab(info.pageUrl, info, tab);
    }
});

// --------------------------- Image --------------------------

chrome.contextMenus.create({
    'title' : 'This image in the sidebar',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        openInSidebar(info.srcUrl, info, tab);
    }
});

chrome.contextMenus.create({
    'title' : 'This image on loveme.do',
    'type' : 'normal',
    'contexts' : ['image'],
    'onclick' : function(info, tab){
        openNewTab(info.srcUrl, info, tab);
    }
});


// --------------------------- Openers --------------------------

function openInSidebar(about, info, tab){
    /*
     * Open the sidebar, looking at the given about value.
     */
    var port = chrome.tabs.connect(tab.id, {name: 'sidebar'});
    port.postMessage({
        about: about,
        action: 'show sidebar'
    });
}

function openNewTab(about, info, tab){
    /*
     * Create a new tab with the object browser looking at the given about value.
     */
    chrome.tabs.create({
        index: tab.index + 1,
        url: 'http://' + lovemedoHost + '/about/' + encodeURIComponent(about)
    });
}


// ---------------------- Dynamic context menu items ------------

// contextMenuItems has attributes that are the text of current
// context menu items. Its values are objects with three attributes,
// 'context' (either 'link' or 'selection'), 'gotoMenuItem' and 
// 'sidebarMenuItem', the menu item indices returned by
// chrome.contextMenus.create.

var contextMenuItems = {};

var addContextMenuItem = function(text, context){
    // Add (possibly truncated) 'text' to the context menu, if not already present.
    text = (text.length < 50 ? text : text.slice(0, 47) + '...').replace(/\n+/g, ' ');

    if (typeof contextMenuItems[text] === 'undefined'){
        var sidebarMenuItem = chrome.contextMenus.create({
            'title' : text + ' in the sidebar',
            'type' : 'normal',
            'contexts' : [context],
            'onclick' : function(info, tab){
                openInSidebar(text, info, tab);
            }
        });
        var gotoMenuItem = chrome.contextMenus.create({
            'title' : text + ' on loveme.do',
            'type' : 'normal',
            'contexts' : [context],
            'onclick' : function(info, tab){
                openNewTab(text, info, tab);
            }
        });
        contextMenuItems[text] = {
            context: context,
            gotoMenuItem: gotoMenuItem,
            sidebarMenuItem: sidebarMenuItem
        };
    }
};

var removeContextMenuItemsByContext = function(context){
    var text;
    for (text in contextMenuItems){
        if (typeof contextMenuItems[text] !== 'undefined' &&
            contextMenuItems[text].context === context){
            chrome.contextMenus.remove(contextMenuItems[text].gotoMenuItem);
            chrome.contextMenus.remove(contextMenuItems[text].sidebarMenuItem);
            delete contextMenuItems[text];
        }
    }
};

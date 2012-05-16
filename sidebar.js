/*
 * infomaniacHost is the hostname (possibly with a colon & port) from which
 * to load sidebar content in an iframe. Use 'localhost:8000' for local
 * testing, 'new.fluidinfo.com' for the staging server, and 'fluidinfo.com'
 * for extension deployments to the Chrome store.
 */
var infomaniacHost = 'new.fluidinfo.com';

var backgroundPort = chrome.extension.connect({
    name: 'content-script'
});


var hideSidebar = function(sidebar){
    sidebar.style.display = 'none';
};

var showSidebar = function(sidebar){
    sidebar.style.display = 'block';
};

var getSidebar = function(){
    return document.getElementById('fi_sidebar');
};

var updateSidebar = function(sidebar, about){
    sidebar.src = 'http://' + infomaniacHost + '/infomaniac/' + encodeURIComponent(about);
};

var toggleSidebar = function(){
    var sidebar = getSidebar();
    if (sidebar){
        if (sidebar.style.display === 'none'){
            showSidebar(sidebar);
        }
        else {
            hideSidebar(sidebar);
        }
    }
    else {
        // There is no sidebar. Create one showing the Fluidinfo object for
        // the current document url, and display it.
        createSidebar(function(sidebar){
            updateSidebar(sidebar, document.location.toString());
            showSidebar(sidebar);
        });
    }
};

var createSidebar = function(callback){
    var parent = (document.getElementsByTagName('body')[0] ||
                  document.getElementsByTagName('html')[0]);
    if (parent){
        // Get the current settings so we know what style & size to use.
        chrome.extension.sendRequest(
            {action: 'get-settings'},
            function(settings){
                var sidebar = document.createElement('iframe');
                sidebar.id = 'fi_sidebar';
                sidebar.classList.add('sidebar');
                sidebar.classList.add(settings.sidebarSide);
                sidebar.setAttribute('width', settings.sidebarWidth + 'px');
                sidebar.title = 'Fluidinfo sidebar';
                parent.appendChild(sidebar);
                callback(sidebar);
            }
        );
    }
    else {
        console.log('Could not find body or html element on page!');
        callback(null);
    }
};


// Listen for instructions from notification pop-ups or from the background page.
chrome.extension.onConnect.addListener(function(port){
    console.assert(port.name === 'sidebar');
    port.onMessage.addListener(function(msg) {
        var sidebar;
        if (msg.action === 'show sidebar'){
            sidebar = getSidebar();
            if (sidebar){
                updateSidebar(sidebar, msg.about);
                showSidebar(sidebar);
            }
            else {
                createSidebar(function(sidebar){
                    updateSidebar(sidebar, msg.about);
                    showSidebar(sidebar);
                    sidebar.onload = function(){
                        backgroundPort.postMessage({injectSidebarJS: true});
                    };
                });
            }
        }
        else if (msg.action === 'hide sidebar'){
            sidebar = getSidebar();
            if (sidebar){
                hideSidebar(sidebar);
            }
        }
        else {
            console.log('got unknown mesg from notification popup:');
            console.log(msg);
        }
    });
});

// Allow toggling the display of the sidebar via Control-Shift-f
shortcut.add('Ctrl+Shift+F', function(){
    console.log('Received Ctrl+Shift+F');
    toggleSidebar();
});

// Allow toggling the display of the sidebar via Control-Shift-f
shortcut.add('Ctrl+Shift+Z', function(){
    console.log('Received Ctrl+Shift+Z');
    toggleSidebar();
});

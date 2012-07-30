var settings = null;

var backgroundPort = chrome.extension.connect({
    name: 'content-script'
});

var hideSidebar = function(sidebar){
    var options = {};
    options[settings.sidebarSide] = -1 * settings.sidebarWidth;
    $(sidebar).animate(options, 500, function(){
        $(sidebar).css('display', 'none');
    });
};

var showSidebar = function(sidebar){
    var options = {};
    options[settings.sidebarSide] = 0;
    $(sidebar).css(settings.sidebarSide, '-' + settings.sidebarWidth + 'px')
        .css('display', 'block')
        .animate(options, 500);
};

var getSidebar = function(){
    return document.getElementById('lovemedo-sidebar-id');
};

var updateSidebar = function(sidebar, about){
    sidebar.src = 'http://' + lovemedoHost + '/infomaniac/' + encodeURIComponent(about);
    sidebar.onload = function(){
        backgroundPort.postMessage({injectSidebarJS: true});
    };
};

var toggleSidebar = function(about){
    var sidebar = getSidebar();
    if (sidebar){
        if (sidebar.style.display === 'none'){
            updateSidebar(sidebar, about);
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
            updateSidebar(sidebar, about);
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
            function(result){
                settings = result;
                var sidebar = document.createElement('iframe');
                sidebar.id = 'lovemedo-sidebar-id';
                sidebar.classList.add('lovemedo-sidebar');
                sidebar.classList.add('lovemedo-sidebar-' + settings.sidebarSide);
                sidebar.setAttribute('width', settings.sidebarWidth + 'px');
                sidebar.title = 'loveme.do sidebar';
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
                updateSidebar(sidebar, valueUtils.lowercaseAboutValue(msg.about));
                showSidebar(sidebar);
            }
            else {
                createSidebar(function(sidebar){
                    updateSidebar(sidebar, valueUtils.lowercaseAboutValue(msg.about));
                    showSidebar(sidebar);
                });
            }
        }
        else if (msg.action === 'hide sidebar'){
            sidebar = getSidebar();
            if (sidebar){
                hideSidebar(sidebar);
            }
        }
        else if (msg.action === 'toggle sidebar'){
            toggleSidebar(valueUtils.lowercaseAboutValue(msg.about));
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
    toggleSidebar(document.location.toString());
});

// Allow toggling the display of the sidebar via Control-Shift-f
shortcut.add('Ctrl+Shift+Z', function(){
    console.log('Received Ctrl+Shift+Z');
    toggleSidebar(document.location.toString());
});

// TODO: this is not needed?
var currentAbout = null;

var hideSidebar = function(){
    var sidebar = document.getElementById('fi_sidebar');
    if (sidebar){
        sidebar.style.display = 'none';
    }
    else {
        console.log('Sidebar logic error: hideSidebar ' +
                    'called, but no sidebar element exists.');
    }
};

var showSidebar = function(){
    var sidebar = document.getElementById('fi_sidebar');
    if (sidebar){
        console.log('Displaying sidebar.');
        sidebar.style.display = 'block';
    }
    else {
        console.log('Sidebar logic error: showSidebar ' +
                    'called, but no sidebar element exists.');
    }
};

var toggleSidebar = function(){
    var sidebar = document.getElementById('fi_sidebar');
    console.log('sidebar toggle. element is');
    console.log(sidebar);
    if (sidebar){
        sidebar.style.display = (sidebar.style.display === 'none' ? 'block' : 'none');
    }
    else {
        // There is no sidebar. Create one showing the Fluidinfo object for
        // the current document url, and display it.
        createOrUpdateSidebar(document.location.toString(), function(){
            showSidebar();
        });
    }
};

var createOrUpdateSidebar = function(about, callback){
    /*
     * Create a new (hidden) sidebar or update the url of the current
     * sidebar element. Do not change the display property if the sidebar
     * already exists.
     */
    var sidebar = document.getElementById('fi_sidebar');
    
    if (sidebar){
        // The sidebar element already exists.
        // TODO: perhaps do nothing if the currentAbout is the one we were passed?
        // Setting the value likely causes a reload.
        console.log('Found existing sidebar element, updating its URL.');
        currentAbout = about;
        sidebar.src = 'http://new.fluidinfo.com/infomaniac/' + encodeURIComponent(about);
        callback();
    }
    else {
        // The sidebar element doesn't exist. Make it.
        var parent = (document.getElementsByTagName('body')[0] ||
                      document.getElementsByTagName('html')[0]);

        if (!parent){
            console.log('Could not find body or html element on page!');
            return;
        }
        
        // Get the current settings so we know what style & size to use.
        chrome.extension.sendRequest(
            {action: 'get-settings'},
            function(options){
                console.log('Creating new sidebar element.');
                console.log(options);
                sidebar = document.createElement('iframe');
                sidebar.id = 'fi_sidebar';
                sidebar.classList.add('sidebar');
                sidebar.classList.add(options.sidebarSide);
		sidebar.setAttribute('width', options.sidebarWidth + 'px');
                sidebar.src = 'http://new.fluidinfo.com/infomaniac/' + encodeURIComponent(about);
                sidebar.title = 'Fluidinfo sidebar';
                parent.appendChild(sidebar);
                currentAbout = about;
                callback();
            }
        );        
    }
};


// Listen for instructions from notification pop-ups.
chrome.extension.onConnect.addListener(function(port){
    console.assert(port.name === 'sidebar');
    port.onMessage.addListener(function(msg) {
        if (msg.action === 'show sidebar'){
            console.log('show sidebar message received.');
            createOrUpdateSidebar(msg.about, function(){
                showSidebar();
            });
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

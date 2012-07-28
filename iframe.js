/*
 * This script is injected into all frames of a tab when the sidebar has
 * been created. It should only do things if it's in the sidebar frame, not
 * in the main tab code.
 */

var close = document.getElementById('lovemedo-sidebar-close');

if (close){
    var port = chrome.extension.connect({
        name: 'sidebar-iframe'
    });

    // Listen for requests from the background page.
    port.onMessage.addListener(function(msg) {
        if (msg.action === 'reload'){
            window.location.reload();
        }
        else {
            console.log('iframe received unrecognized message from background: ', msg);
        }
    });

    close.addEventListener(
        'click',
        function(evt){
            port.postMessage({
                action: 'hide sidebar'
            });
            return false;
        },
        false
    );
    
    document.getElementsByTagName('body')[0].addEventListener(
        'click',
        function(evt){
            // Intercept click events on links and send a message to the
            // background page so they can be displayed in the current tab.
            var url = null;
            if (evt.target.nodeName === 'A'){
                url = evt.target.getAttribute('href');
            }
            else if (evt.target.nodeName === 'IMG'){
                url = evt.target.parentNode.getAttribute('href');
                if (url && url.slice(0, 17) === '/login/fluidinfo/'){
                    // The user is trying to log in. Ask the background
                    // page to start that process (we can't do it here as
                    // we're just a lowly iframe).
                    port.postMessage({
                        action: 'oauth login'
                    });
                    evt.preventDefault();
                    evt.stopPropagation();
                    return false;
                }
            }
            if (url){
                // Ask the background page to open the link in the tab that
                // created us.
                port.postMessage({
                    action: 'open',
                    docURL: document.location.toString(),
                    linkURL: url
                });
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
            else {
                return true;
            }
        },
        true
    );
}

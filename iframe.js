/*
 * This script is injected into all frames of a tab when the sidebar has
 * been created. It should only do things if it's in the sidebar frame, not
 * in the main tab code.
 */

var close = document.getElementById('fluidinfo-sidebar-close');

if (close){
    var port = chrome.extension.connect({
        name: 'sidebar-iframe'
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
            if (evt.target.nodeName === 'A'){
                port.postMessage({
                    action: 'open',
                    docURL: document.location.toString(),
                    linkURL: evt.target.getAttribute('href')
                });
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
            return true;
        },
        true
    );
}

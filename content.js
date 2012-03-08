var port = chrome.extension.connect({name: 'content-script'});

var postMessage = function(msg){
    if (port !== null){
        try {
            port.postMessage(msg);
        }
        catch(error){
            // The extension has probably been disabled or uninstalled.
            // Deactivate ourself. If the extension is reinstalled or
            // reloaded, it will inject another copy of this script
            // into this same page.
            port = null;
            // Stop doing useless selection detection work, to reduce
            // the load the extension puts on the poor browser.
            checkSelection = function(){};
        }
    }
};

var createOverListener = function(node){
    // Return a function that will send the innerText of a node to our
    // background page. We'll use the functions returned as mouseover
    // functions on links in (and added to) the document.
    return function(){
        // Send the link text, trimmed of leading/trailing whitespace and
        // also the URL of the page.
        postMessage({
            docURL: document.location.toString().toLowerCase(),
            linkURL: node.getAttribute('href'),
            mouseover: true,
            text: node.innerText.replace(/^\s+|\s+$/g, '')
        });
        return true;
    };
};

var createOutListener = function(node){
    // Return a function that will send a mouseout message to the
    // background page. We'll use the functions returned as mouseout
    // functions on links in (and added to) the document.
    return function(){
        postMessage({
            mouseout: true
        });
        return true;
    };
};

var addListeners = function(nodes){
    for (var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        node.addEventListener('mouseover', createOverListener(node));
        node.addEventListener('mouseout', createOutListener(node));
    }
};

// Add a mouse event listener for all <a> tags in the document once it has
// been loaded.
addListeners(document.getElementsByTagName('a'));

// Arrange to add a mouse event listener to all <a> tags that get added to
// the document.

var body = document.getElementsByTagName('body')[0];
body.addEventListener ('DOMNodeInserted', function(event){
    if (event.target.getElementsByTagName){
        addListeners(event.target.getElementsByTagName('a'));
    }
});

var checkSelection = function(event){
    var selection = window.getSelection().toString();
    if (selection){
        postMessage({
            selection: selection.replace(/^\s+|\s+$/g, '')
        });
    } else {
        postMessage({
            selectionCleared: true
        });
    }
};

document.addEventListener('mouseup', checkSelection, true);
document.addEventListener('keyup', checkSelection, true);

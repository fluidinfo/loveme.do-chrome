var port = chrome.extension.connect({name: 'context'});

var createOverListener = function(node){
    // Return a function that will send the innerText of a node to our
    // background page. We'll use the functions returned as mouseover
    // functions on links in (and added to) the document.
    return function(){
        // Send the link text, trimmed of leading/trailing whitespace and
        // also the URL of the page.
        /*
         console.log('LISTENER sending:');
         console.log('  text: ' + node.innerText.replace(/^\s+|\s+$/g, ''));
         console.log('  linkURL: ' + node.getAttribute('href'));
         console.log('  docURL: ' + document.location.toString().toLowerCase());
         */
        port.postMessage({
            text: node.innerText.replace(/^\s+|\s+$/g, ''),
            linkURL: node.getAttribute('href'),
            docURL: document.location.toString().toLowerCase()
        });
        return true;
    };
};

var createOutListener = function(node){
    // Return a function that will send a mouseout message to the
    // background page. We'll use the functions returned as mouseout
    // functions on links in (and added to) the document.
    return function(){
        port.postMessage({
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

// Add a mouse event listeners for all <a> tags in the document once it has
// been loaded.
addListeners(document.getElementsByTagName('a'));

// Arrange to add a mouse event listeners to all <a> tags that get added to
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
        port.postMessage({
            selection: selection
        });
    } else {
        port.postMessage({
            selectionCleared: true
        });
    }
};

document.addEventListener('mousedown', checkSelection, true);
document.addEventListener('mouseup', checkSelection, true);
document.addEventListener('keyup', checkSelection, true);

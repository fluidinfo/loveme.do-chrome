var port = chrome.extension.connect({name: 'linktext'});

var createListener = function(node){
    // Return a function that will send the innerText of a node to our
    // background page. We'll use the functions returned as mouseover
    // functions on links in (and added to) the document.
    return function(){
        // Send the link text, trimmed of leading/trailing whitespace.
        port.postMessage({text: node.innerText.replace(/^\s+|\s+$/g, '')});
        return true;
    };
};

var addListeners = function(nodes){
    for (var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        node.addEventListener('mouseover', createListener(node));
    }
};

// Add a mouseover listener for all <a> tags in the document once it has been loaded.
addListeners(document.getElementsByTagName('a'));

// Arrange to add a mouseover listener to all <a> tags that get added to the document.
var body = document.getElementsByTagName('body')[0];
body.addEventListener ('DOMNodeInserted', function(event){
    if (event.target.getElementsByTagName){
        addListeners(event.target.getElementsByTagName('a'));
    }
});

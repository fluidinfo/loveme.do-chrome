var port = chrome.extension.connect({name: 'linktext'});

var nodes = document.getElementsByTagName('a');

var createListener = function(msg){
    return function(){
        port.postMessage({text: msg});
        return true;
    };
};

for (var i = 0; i < nodes.length; i++){
    nodes[i].addEventListener('mouseover', createListener(nodes[i].innerText));
}

/*
var body = document.getElementsByTagName('body')[0];

body.addEventListener ('DOMNodeInserted', function(event){
    // alert('new node' + event);
    console.log(event);
});

*/

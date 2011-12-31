var port = chrome.extension.connect({name: 'linktext'});

var nodes = document.getElementsByTagName('a');

var createListener = function(msg){
    return function(){
        port.postMessage({text: msg});
    };
};

for (var i = 0; i < nodes.length; i++){
    nodes[i].addEventListener('mouseover', createListener(nodes[i].innerText));
}

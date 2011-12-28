chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        if (request.url){
            var url = request.url;
            var links = document.links;
            var result = [];
            for (var i = 0; i < links.length; i++){
                if (links[i].href === url){
                    result.push(links[i].innerText);
                }
            }
            sendResponse({result: result});
        }
        else {
            sendResponse({});
        }
    }
);

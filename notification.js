// Note: customDisplayPrefixes is already in scope in this file.
// It's a global, declared in domains/domains.js


var populate = function(options){
    /*
     * options contains:
     *     about
     *     knownPrefixes
     *     tabId
     *     tagValueHandler
     */
    var about = options.about;
    var truncatedAbout = valueUtils.truncateAbout(about, 35);
    var url = 'http://' + lovemedoHost + '/about/' + encodeURIComponent(about);
    
    document.getElementById('fi_url').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">{{truncatedAbout}}</a>.', {
            truncatedAbout: truncatedAbout,
            url: url
        }
    );

    document.getElementById('fi_open_sidebar').addEventListener(
        'click',
        function(evt){
            var port = chrome.tabs.connect(options.tabId, {name: 'sidebar'});
            port.postMessage({
                about: options.about,
                action: 'show sidebar'
            });
            evt.preventDefault();
            evt.stopPropagation();
            return false;
        },
        false
    );

    // Add the HTML for each of the custom prefixes on the object.
    var content = [];
    for (var i = 0; i < options.knownPrefixes.length; i++){
        var prefix = options.knownPrefixes[i];
        var func = customDisplayPrefixes[prefix];
        var tagValues = options.tagValueHandler.cache;
        content.push(func(tagValues, about));
    }

    document.getElementById('fi_tags').innerHTML = content.join('');
};

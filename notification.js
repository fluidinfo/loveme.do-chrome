var _getCustomPrefixesOnObject = function(tagPaths){
    var prefixes = {};
    for (prefix in customDisplayPrefixes){
        if (customDisplayPrefixes.hasOwnProperty(prefix)){
            for (var i = 0; i < tagPaths.length; i++){
                if (tagPaths[i].slice(0, prefix.length) === prefix){
                    // This is one of the prefixes in customDisplayPrefixes
                    prefixes[prefix] = true;
                }
            }
        }
    }
    return prefixes;
};

var _filterCustomPrefixesFromTagList = function(tagPaths, customPrefixes){
    var resultTags = [];
    for (var i = 0; i < tagPaths.length; i++){
        var tagPath = tagPaths[i];
        var foundCustom = false;
        for (prefix in customDisplayPrefixes){
            if (customDisplayPrefixes.hasOwnProperty(prefix)){
                if (tagPath.slice(0, prefix.length) === prefix){
                    foundCustom = true;
                    break;
                }
            }
        }
        if (!foundCustom){
            resultTags.push(tagPath);
        }
    }
    return resultTags;
};

var populate = function(options){
    /*
     * options contains:
     *     about
     *     dropNamespaces
     *     loggedIn
     *     title
     *     tagValueHandler
     *     wantedTags
     */
    var about = options.about;
    var truncatedAbout = valueUtils.truncateAbout(about, 35);
    var url = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(about);

    document.getElementById('fi_login').style.display = (options.loggedIn ? 'none' : '');
    document.getElementById('fi_title').innerHTML = options.title;
    document.getElementById('fi_url').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">{{truncatedAbout}}</a>', {
            truncatedAbout: truncatedAbout,
            url: url
        }
    );

    var customPrefixesOnObject = _getCustomPrefixesOnObject(options.wantedTags);
    var regularTags = _filterCustomPrefixesFromTagList(options.wantedTags,
                                                       customPrefixesOnObject);
    var content = [];

    // Add the HTML for each of the custom prefixes on the object.
    for (prefix in customPrefixesOnObject){
        if (customPrefixesOnObject.hasOwnProperty(prefix)){
            var func = customDisplayPrefixes[prefix];
            var tagValues = options.tagValueHandler.cache;
            content.push(func(tagValues, about));
        }
    }

    // Add the regular HTML for the tags that are not part of a custom prefix.
    try {
        var regularContent = valueUtils.pathsAndValuesToHTML({
            displayImages: false,
            dropNamespaces: options.dropNamespaces,
            fetchLinks: false,
            linkTags: true,
            result: { data: options.tagValueHandler.cache },
            showTagPaths: true,
            tagPaths: regularTags
        });

        content.push(regularContent.content);
    }
    catch (error){
        console.log('Hit an error rendering regular tag values.');
        console.log(error.message);
    }

    document.getElementById('fi_tags').innerHTML = content.join('');
};

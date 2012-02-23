var populate = function(options){
    /*
     * options contains dropNamespaces, title, url, valuesCache, wantedTags
     */
    var url = options.url;

    var truncatedURL;
    if (url.length > 48){
        truncatedURL = url.slice(0, 48) + '...';
    }
    else {
        truncatedURL = url;
    }

    // Chop off useless https?:// prefix.
    var match = truncatedURL.indexOf('://');
    if (match > -1){
        truncatedURL = truncatedURL.slice(match + 3);
    }

    document.getElementById('fi_url').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">{{truncatedURL}}</a>', {
            truncatedURL: truncatedURL,
            url: url
        }
    );
    document.getElementById('fi_title').innerHTML = Mustache.render(
        '{{title}}', {
            title: options.title
        }
    );

    try {
        var content = valueUtils.pathsAndValuesToHTML({
            displayImages: false,
            dropNamespaces: options.dropNamespaces,
            fetchLinks: false,
            linkTags: true,
            result: { data: options.valuesCache.cache },
            showTagPaths: true,
            tagPaths: options.wantedTags
        });
        document.getElementById('fi_tags').innerHTML = content.content;
    }
    catch (error){
        console.log('Hit an error rendering tag values.');
        console.log(error.message);
    }
};

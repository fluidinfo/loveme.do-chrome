var populate = function(options){
    /*
     * options contains wantedTags, valuesCache
     */
    document.getElementById('fi_url_external').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">{{url}}</a>', {
            url: options.url
        }
    );
    document.getElementById('fi_url_internal').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">This page in Fluidinfo</a>', {
            url: 'http://fluidinfo.com/about/#!/' + encodeURIComponent(options.url)
        }
    );

    console.log(options);
    try {
        var content = valueUtils.pathsAndValuesToHTML({
            displayImages: false,
            dropNamespaces: true,
            fetchLinks: false,
            linkTags: true,
            result: { data: options.valuesCache.cache },
            showTagPaths: true,
            tagPaths: options.wantedTags
        });
        console.log(content.content);
        document.getElementById('fi_yourtags').innerHTML = content.content;
    }
    catch (error){
        console.log('Hit an error rendering tag values.');
        console.log(error.message);
        document.getElementById('fi_yourtags').innerHTML = error.message;
    }
};

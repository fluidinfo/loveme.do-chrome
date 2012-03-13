var populate = function(options){
    /*
     * options contains about, dropNamespaces, title, tagValueHandler, wantedTags
     */
    var about = options.about;
    var truncatedAbout = valueUtils.truncateAbout(about, 35);
    var url = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(about);

    document.getElementById('fi_url').innerHTML = Mustache.render(
        '<a href="{{url}}" target="_blank">{{truncatedAbout}}</a>', {
            truncatedAbout: truncatedAbout,
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
            result: { data: options.tagValueHandler.cache },
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

var radarPlugin = (function() {
    var my = {};

    var _divHeader = (
        '<div class="radar">' +
          '<a href="http://www.oreilly.com/" target="_blank">' +
            '<img id="radar-logo" src="' +
              chrome.extension.getURL('domains/radar.oreilly.com.png') +
            '"/>' +
          '</a>' +
          '<br/>' +
          '<ul>'
    );

    var _divFooter = '</ul></div>';

    var _renderPost = function(post){
        /*
         * Produce HTML to render a post.
         *
         * param post: a JS object with string attributes:
         *     'title': The post's title.
         *     'url': The URL of the post on O'Reilly Radar.
         *
         * return: an HTML string.
         */
        return Mustache.render(
            (
                '<li>' +
                '<a href="{{ url }}" target="_blank">{{ title }}</a>' +
                '</li>'
            ),
            post
        );
    };

    var _renderPosts = function(posts){
        /*
         * Produce HTML to render a list of Radar posts.
         *
         * param posts: a JS list of objects. Each object has attributes:
         *     'title': The title of the Radar article.
         *     'url': The URL of the article.
         *
         * return: an HTML string.
         */
        var content = [ _divHeader ];
        for (var i = 0; i < posts.length; i++){
            content.push(_renderPost(posts[i]));
        }
        content.push(_divFooter);
        return content.join('');
    };

    my.render = function(object, about){
        /*
         * Render content for an object that has O'Reilly Radar tags on it.
         *
         * param about: The about value of the object.
         * param object: A JS object with the Fluidinfo tags and values.
         *
         * return: an HTML string if an O'Reilly Radar tag is found, else the
         *     empty string.
         */
        if (object.hasOwnProperty('radar.oreilly.com/posts')){
            var posts = _parseJSONTag('radar.oreilly.com/posts', object, about);
            if (posts){
                return _renderPosts(posts);
            }
        }
        return '';
    };

    return my;
}());

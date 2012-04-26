var telegraphPlugin = (function() {
    var my = {};

    var _divHeader = (
        '<div class="telegraph">' +
          '<a href="http://www.telegraph.co.uk/" target="_blank">' +
            '<img id="telegraph-logo" src="' +
              chrome.extension.getURL('domains/telegraph.co.uk.png') +
            '"/>' +
          '</a>' +
          '<br/>' +
          '<ul>'
    );

    var _divFooter = '</ul></div>';

    var _post = function(post){
        /*
         * Produce HTML to render a post.
         *
         * param post: a JS object with string attributes:
         *     'title': The post's title.
         *     'url': The URL of the post on Telegraph.
         *
         * return: an HTML string.
         */
        return Mustache.render(
            (
                '<li>' +
                '<a href="{{ url }}" target="_blank">{{ title }}</a> <span class="date">{{ publication-date }}</span>' +
                '</li>'
            ),
            post
        );
    };

    var _renderPosts = function(posts){
        /*
         * Produce HTML to render a list of Telegraph posts.
         *
         * param posts: a JS list of objects. Each object has attributes:
         *     'title': The title of the Radar article.
         *     'url': The URL of the article.
         *
         * return: an HTML string.
         */
        var content = [ _divHeader ];
        for (var i = 0; i < posts.length; i++){
            content.push(_post(posts[i]));
        }
        content.push(_divFooter);
        return content.join('');
    };

    my.render = function(object, about){
        /*
         * Render content for an object that has Telegraph tags on it.
         *
         * param about: The about value of the object.
         * param object: A JS object with the Fluidinfo tags and values.
         *
         * return: an HTML string if an Telegraph tag is found, else the
         *     empty string.
         */
        if (object.hasOwnProperty('telegraph.co.uk/posts')){
            var posts = _parseJSONTag('telegraph.co.uk/posts', object, about);
            if (posts){
                return _renderPosts(posts);
            }
        }
        return '';
    };

    return my;
}());

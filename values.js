var valueUtils = {
    tweetLinkRegex: /^https?:\/\/twitter.com\/.*\/status\/(\d+)$/,
    numberRegex: /^\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?\s*$/,
    uriRegex: /^([a-z][-+.a-z0-9]{0,11}):\/\/(.+)/i,
    lowercaseAboutValue: function(str){
        var match = this.uriRegex.exec(str);
        if (match){
            var scheme = match[1];
            var postScheme = match[2];
            var userpass = '';
            var hostport = '';
            var rest = '';
            var slash = postScheme.indexOf('/');

            if (slash > -1){
                rest = postScheme.slice(slash);
                var hierarchicalPart = postScheme.slice(0, slash);
            }
            else {
                var hierarchicalPart = postScheme;
            }

            if (hierarchicalPart){
                var at = hierarchicalPart.indexOf('@');
                if (at > -1){
                    userpass = hierarchicalPart.slice(0, at + 1);
                    hostport = hierarchicalPart.slice(at + 1);
                }
                else {
                    hostport = hierarchicalPart;
                }
            }

            return scheme.toLowerCase() + '://' + userpass + hostport.toLowerCase() + rest;
        }
        else {
            return str.toLowerCase();
        }
    },
    quoteAbout: function(s){
        return s.replace(/\"/g, '\"');
    },
    isLink: function(str){
        // Return true if str looks like an https?:// link. Don't allow < or >
        // to appear, as a simple form of preventing html tags (like <script>)
        // tricking us into thinking they're normal links.
        return /^(https?|file):\/\/[^\<\>]+$/i.test(str);
    },
    hasImageSuffix: function(str){
        // Return true if str ends in a suffix that corresponds to an image format.
        var questionMark = str.indexOf('?');
        if (questionMark !== -1){
            // This (assumed) link has a '?' in it (such as a Twitpic image link). Get rid of the
            // URL args before looking to see if the URL has an image suffix.
            str = str.slice(0, questionMark);
        }
        var dotPosition = str.lastIndexOf('.');
        if (dotPosition !== -1){
            var suffix = str.slice(dotPosition).toLowerCase();
            if (suffix === '.gif' || suffix === '.jpg' || suffix === '.jpeg' || suffix === '.png'){
                return true;
            }
        }
        return false;
    },
    linkToHTML: function(options) {
        /*
         * Turn a link string into an HTML link (with text link).
         * options contains
         *   displayImages: if true and the link is an image, display it.
         *   link: the URL
         *   maxImageHeight: if the link is an image (and displayImages
         *       is true) this is the max-height attribute for the <img> tag.
         *   useSameTab: if truish, then the link will open a new tab.
         */
        var sameTabFragment = options.useSameTab ? '' : ' target="_blank"';
        var link = options.link;
        if (options.displayImages && this.hasImageSuffix(link)){
            // Show a small(?) clickable version of images.
            var maxHeight = options.maxImageHeight || 150;
            return '<a href="' + link + '"' + sameTabFragment + '><img src="' + link + '" style="max-height: ' + maxHeight + 'px;"/></a>';
        }
        else {
            return '<a href="' + link + '"' + sameTabFragment + '>' + link + '</a>';
        }
    },
    pathsAndValuesToHTML: function(options) {
        /* options is an object with properties:
         *
         *   displayImages: if truish, display images, else just show their URLs.
         *   displayRating: if true, convert the rating value into stars. Defaults to true.
         *   dropNamespaces: if truish, remove the leading namespace from tag paths.
         *   idPrefix: a prefix to use in id="" spans when showing link content.
         *   metadata: if defined, is an object with an attribute for each tag
         *       path (like result.data), whose values are each an object with
         *       the attribute 'timestamp' for the tag value.
         *   result: what was returned from the corresponding Fluiddb /values call.
         *   tagPaths: a list of tags whose values you asked for from Fluiddb.
         *   showTagPaths: if true, show the tag paths in the output. Else suppress.
         *   sortLists: if true, sort individual tag values that are lists.
         *   sortResult: if true, sort the overall result on tag path.
         *
         * Return an object with 2 attributes:
         *
         *   content:   a string of HTML that displays the tags mentioned in
         *              options.tagPaths, with their values as given in options.result.
         *   callbacks: a list of functions to be called after the returned
         *              content has been added to the DOM.
         */
        var dropNamespaces = options.dropNamespaces;
        var idPrefix = options.idPrefix;
        var result = options.result;
        var tagPaths = options.tagPaths;
        var displayRating = (options.displayRating === false) ? false : true;
        var pathsAndValues = [];
        var tweetLinkRegex = this.tweetLinkRegex;
        var sortLists = (options.sortLists === undefined ? false : options.sortLists);
        var sortResult = (options.sortResult === undefined);
        var metadata = (options.metadata === undefined ? false : options.metadata);

        var twitterURLRespectingCompareFunc = function(a, b){
            // Used to sort individual values in tag values that are a list of strings.
            // Does a normal alphabetical compare, unless both arguments are Tweet URLS,
            // in which case later tweets come first.
            var match = tweetLinkRegex.exec(a);
            if (match){
                var statusA = parseInt(match[1], 10);
                match = tweetLinkRegex.exec(b);
                if (match){
                    var statusB = parseInt(match[1], 10);
                    if (statusA === statusB){
                        // This shouldn't happen, but could.
                        return 0;
                    }
                    return statusA < statusB ? 1 : -1;
                }
            }
            if (a === b){
                return 0;
            }
            return a < b ? -1 : 1;
        };

        var formatPrimitive = function(options){
            // Format a primitive value (value) to appear as a tag value in a widget.
            //
            // options is an object containing:
            //
            //   displayImages: if truish, display images. Else display their URLs.
            //   inList: if true, the value is part of a tag value that's a list.
            //   tagPath: the tag path
            //   value: the value to format
            //
            // The value may be the single value for a tag or may be one of several (strings)
            // in a tag value that's a list.
            //
            // Return an object with 2 attributes:
            //
            //   content: the HTML content to display for this value.
            //   callback: a callback function to call to update the content (once
            //             it has been inserted into the DOM), or undefined.
            //
            var content;
            var callback;
            var tagPath = options.tagPath;
            var value = options.value;
            var id = options.id;

            if (valueUtils.isLink(value)){
                if (valueUtils.hasImageSuffix(value)){
                    content = valueUtils.linkToHTML({
                        displayImages: options.displayImages,
                        link: $('<div/>').text(value).html()
                    });
                }
                else {
                    content = valueUtils.linkToHTML({
                        link: $('<div/>').text(value).html()
                    });
                }
            }
            else {
                // Not a link.
                //
                // Check if it's a rating tag.

                tagPath = tagPath.slice(tagPath.indexOf('/') + 1);
                if (displayRating && tagPath == 'rating' &&
                    value >= 0 && value <= 5) {
                    content = valueUtils.makeRatingImages(value);
                }
                else {
                    content = $('<div/>').text(value).html();
                }
            }

            return {
                callback: callback,
                content: content
            };
        };

        function formatOpaqueValue(options) {
            var rawContent,
                result,
                value = options.value,
                size = value.size,
                suffix = ["bytes", "KB", "MB", "GB", "TB", "PB"],
                tier = 0,
                audioTag;

            while(size >= 1024 && tier <= 5) {
                size = size / 1024;
                tier++;
            }
            value.size = Math.round(size * 10) / 10 + " " + suffix[tier];

            rawContent = Mustache.to_html(
                'Binary value ({{value-type}}, {{size}}). ' +
                '<a target="_blank" href="{{url}}">View</a>.', value);

            audioTag = $('<audio />')[0];
            if (options.displayAudio !== undefined &&
                    audioTag.canPlayType !== undefined &&
                    audioTag.canPlayType(value["value-type"])) {
                result = Mustache.to_html(
                    '<audio src="{{source}}" controls="controls">' +
                    '{{{fallback}}}</audio>', {
                        source: value.url,
                        fallback: rawContent
                });
            }
            else {
                result = rawContent;
            }

            return result;
        }

        // Functions to be called once the HTML content we return has been
        // added to the DOM.
        var callbacks = [];

        for (var i = 0; i < tagPaths.length; i++){
            var path = tagPaths[i];
            var value = result.data[path];
            var formattedValue;
            // The HTML escaping trick below is from
            // http://css-tricks.com/snippets/javascript/htmlentities-for-javascript/
            if (value === undefined){
                // The object had no instance of this tag.
                formattedValue = 'Not present on object.';
            }
            else if (value === null){
                formattedValue = '';
            }
            else if (Object.prototype.toString.apply(value) === '[object Array]'){
                // An array of strings.
                var maxEntriesToShow = value.length;
                if (sortLists){
                    value.sort(twitterURLRespectingCompareFunc);
                }
                var formatted = [];
                for (var j = 0; j < value.length && j < maxEntriesToShow; j++) {
                    var content = formatPrimitive({
                                      displayImages: options.displayImages,
                                      id: idPrefix + i + '-' + j,
                                      inList: true,
                                      tagPath: path,
                                      value: value[j]
                                     });
                    formatted.push('<li>' + content.content + '</li>');
                    content.callback && callbacks.push(content.callback);
                }
                if (j){
                    formattedValue = '<ul class="tagValueList">' + formatted.join('')  + '</ul>';
                }
                else {
                    // Value was an empty list.  What to show?
                    formattedValue = 'Empty list';
                }
            }
            else if (typeof value === 'object'){
                // A JS object that's not an array is an opaque value.
                formattedValue = formatOpaqueValue({
                    value: value,
                    displayAudio: true
                 });
            }
            else if (value === true){
                formattedValue = '<img src="booleanTrue.png" width="14" height="14"/>';
            }
            else if (value === false){
                formattedValue = '<img src="booleanFalse.png" width="14" height="14"/>';
            }
            else {
                // A primitive value.
                var content = formatPrimitive({
                                  displayImages: options.displayImages,
                                  id: idPrefix + i,
                                  inList: false,
                                  tagPath: path,
                                  value: value
                                  });
                formattedValue = content.content;
                content.callback && callbacks.push(content.callback);
            }

            var info = {
                encodedPath: encodeURIComponent(path),
                value: formattedValue
            };

            if (metadata){
                info.timestamp = metadata[path].timestamp;
            };

            if (dropNamespaces){
                // Assume all paths have a slash.
                path = path.slice(path.indexOf('/') + 1);
            }
            info.path = path;

            pathsAndValues.push(info);
        }

        if (sortResult){
            pathsAndValues.sort(
                function (a, b){
                    if (a.path === b.path){
                        // This is impossible, at least if we're sorting a tag paths
                        // that come from the same object.
                        return 0;
                    }
                    else {
                        return a.path < b.path ? -1 : 1;
                    }
                }
            );
        }

        var template = '{{#data}}';

        if (options.showTagPaths){
            template += (
                '<div class="tagItem">' +
                '<div class="tagDisplay">' +
                '<div>' +
                '<img src="{{bullet}}" alt="tag" class="tagBullet"/>' +
                '<span class="tagName">');

            if (options.linkTags){
                template += '<a target="_blank" class="taglink" href="http://fluidinfo.com/about/#!/{{encodedPath}}/tagged_objects">{{path}}{{#possibleColon}}{{{value}}}{{/possibleColon}}</a>';
            }
            else {
                template += '{{path}}{{#possibleColon}}{{{value}}}{{/possibleColon}}';
            }

            template += '</span>'; // Tag name

            if (metadata){
                template += '<span class="timestamp">{{timestamp}}</span>';
            }

            template += '{{#valueSection}}{{{value}}}{{/valueSection}}';

            template += ('</div>' + // tagDisplay
                         '</div>' // tagItem
            );
        }
        else {
            template += '<div class="tagAndValue">{{{value}}}</div>';
        }

        template += '{{/data}}';

        return {
            callbacks: callbacks,
            content: Mustache.to_html(template, {
                data: pathsAndValues,
                bullet: 'tagBullet.png',
                possibleColon: function(){
                    return function(value, render){
                        return render(value === '' ? '' : ':');
                    };
                },
                valueSection: function(){
                    return function(value, render){
                        if (value.slice(0, 3) === '<ul'){
                            return render('</div><div class="tagAndValue">' + value + '</div>');
                        }
                        else {
                            return render(' ' + value + '</div>');
                        }
                    };
                }
            })
        };
    },

    makeRatingImages: function(rating) {
        /*
         * Converts rating into stars
         *
         * rating: integer to be converted
         * returns: HTML code of the star images
         */

        var out = '';
        for (var k = 1; k <= 5; k++) {
            out += '<div class="star-rating';
            if (rating >= k) {
                out += ' star-rating-hover';
            }
            out += '"><a style="font-size: 15px;" title="on">&nbsp;&nbsp;&nbsp;&nbsp;</a></div>';
        }

        return out;
    }
};

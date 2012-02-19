var valueUtils = {
    tweetLinkRegex: /^https?:\/\/twitter.com\/.*\/status\/(\d+)$/,
    numberRegex: /^\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?\s*$/,
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
    parseFluidinfoValue: function(value) {
        /*
         * Parse a string into one of the 5 types of values recognized by
         * Fluidinfo.
         *
         * param: value is a string
         *
         * return: a value of type
         *
         *             null | [string] | float | bool | string
         *
         */
        // convert empty string to null
        if(value === "") {
            return null;
        }
        // The value is a string of some sort. Check it's not a
        // list. (Found within [] and comma separated).
        if(value.match(/^\[.*\]$/)){
            // Convert to Array
            var rawArray = value.replace("[", "").replace("]", "").split(",");
            var i;
            var val = [];
            for(i=0; i<rawArray.length; i++) {
                var cleanResult = rawArray[i].replace(/^\s+|\s+$/g,"");
                val.push(cleanResult);
            }
            return val;
        } else if(value.match(valueUtils.numberRegex)) {
            // looks like a number
            return parseFloat(value);
        } else {
            // check for a boolean / null value
            var test = value.toLowerCase();
            if(test === "true" || test === "false") {
                return test === "true";
            } else if(test === "null") {
                return null;
            } else {
                // it's just a plain old string
                return value;
            }
        }
    },
    makeInternalAndExternalLinks: function(options){
        /*
         * Create a piece of HTML with links to an internal Fluidinfo object and
         * an external url.
         *
         * This is useful to plugins that want to generate both an internal and
         * an external link to something, given a url for the thing and the text
         * that should appear in the link.
         *
         * param: options is an object with properties:
         *
         *   getMediaPath: a function to produce an internal site media link.
         *   lowerCaseInternalLink: if true, the internal link is lowercased.
         *   text: The visible text to go into the link.
         *   about: The about value, defaults to text if mnot present.
         *   url: the external URL
         *
         * return: HTML with 2 links: one to the internal /about/#! for the text
         * and one with the external image icon linked to the url.
         *
         * Example:  if you pass an options argument of
         *   { url: 'http://somewhere.com', text: 'Animals', ... }
         *
         *   The internal link will point to the about option (/about/#!/(about))
         *   or /about/#!/animals if text is Animals.
         *
         *   The external link will point to http://somewhere.com and will have our
         *   external link icon as the <a> link.
         *
         */
        var externalIcon = options.getMediaPath('images/external-link.png');
        var lowerCaseInternalLink = (options.lowerCaseInternalLink === undefined ?
                                     true : options.lowerCaseInternalLink);
        var internalObject = (options.about === undefined ? options.text : options.about);

        if (lowerCaseInternalLink){
            internalObject = internalObject.toLowerCase();
        }

        return (
            // The internal link:
            '<a href="/about/#!/' + encodeURIComponent(internalObject) + '">' + options.text + '</a>' +
            ' ' +
            // The external link, opening in a new tab:
            '<a target="_blank" href="' + options.url + '"><img src="' + externalIcon + '"/></a>');
    },
    makeExternalLink: function(options){
        /*
         * Create a piece of HTML with links to an external url.
         *
         * This is useful to plugins that want to generate an external link to
         * something, given a url for the thing and the text that should appear
         * in the link. An external icon is added.
         *
         * param: options is an object with properties:
         *
         *   getMediaPath: a function to produce an internal site media link.
         *   text: The visible text to go into the link.
         *   url: the external URL
         *
         * Example:  if you pass an options argument of
         *   { url: 'http://somewhere.com', text: 'Animals', ... }
         *
         *   The external link will point to http://somewhere.com and will have
         *   Animals as its text, and be followed by our external link icon.
         *
         */
        var externalIcon = options.getMediaPath('images/external-link.png');
        return (
            '<a target="_blank" href="' + options.url + '">' +
            options.text + '&nbsp;<img src="' + externalIcon + '"/></a>');
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
    scheduleLinkUpdate: function(options){
        /*
         * options contains:
         *
         *   id: the id of the span to populate if we recognize the link.
         *   inList: if true, the value we'll replace was inside an <li>, so we
         *       need to put the new value in one as well.
         *   link: the URL tag value.
         *   noImage: don't include the image in the html.
         *
         * If we recognize the link, fire an AJAX request that on success
         * will update the value in the span for the tag value.
         *
         * The obvious example use case is a tag value that refers to a tweet.
         * We know how to display a link to the tweet (that's what was in the
         * tag value), but we want the value that's displayed to actually be
         * the contents of the tweet.
         *
         * Return true if an update is schedule, false if not.
         *
         */
        var link = options.link;

        if (link.slice(0, 7) === 'file://'){
            // There's no point in asking embed.ly or Twitter for an embed
            // of a local file.
            return false;
        }

        var inList = options.inList;
        var noImage = options.noImage;
        var match = this.tweetLinkRegex.exec(link);
        if (match){
            var status = match[1];
            var url = 'http://api.twitter.com/1/statuses/oembed.json?id=' + status + '&omit_script=true';
            var onSuccess = function(result){
                if (inList){
                    var content = '<li class="embed">' + result.html + '</li>';
                }
                else {
                    var content = result.html;
                }
                $('#' + options.id).html(content);
                $.jStorage.set(link, content);
                $.jStorage.setTTL(link, 7 * 24 * 60 * 60 * 1000); // Valid for a week.
            };
            var onError = function(jqXHR, textStatus, errorThrown) {
                console.log('error accessing ' + url + ' to get contents of link ' + link +
                            '  textStatus = "' +  textStatus + '". errorThrown = "' +
                            errorThrown + '".');
            };
            $.ajax({
                dataType: 'jsonp',
                error: onError,
                jsonp: 'callback',
                success: onSuccess,
                url: url
            });
        }
        else {
            // Use embed.ly for other links.
            $.embedly(link, {
                key: '08cf757624e911e1b1074040d3dc5c07',
                maxWidth: 500,
                success: function(oembed, dict) {
                    var type = oembed.type;
                    var content;
                    var code, style, title, units, thumb, description;
                    var _a = oembed.type;
                    if (_a === 'photo') {
                        title = oembed.title || '';
                        code = ('<a href="' + dict.url + '" target="_blank"><img style="tag-value-thumbnaail" src="' +
                                oembed.url + '" alt="' + title + '" /></a>');
                    } else if (_a === 'video') {
                        code = oembed.html;
                    } else if (_a === 'rich') {
                        code = oembed.html;
                    } else {
                        title = oembed.title || dict.url;
                        thumb = (!noImage && oembed.thumbnail_url) ? '<img class="tag-value-thumbnail" src="' + oembed.thumbnail_url + '" />' : '';
                        description = oembed.description ? '<div class="tag-value-description">' + oembed.description + '</div>' : '';
                        code = thumb + '<a class="tag-value-title" href="' + dict.url + '">' + title + '</a>' + description;
                    }

                    if (inList){
                        code = '<li class="embed">' + code + '</li>';
                    }

                    $('#' + options.id).html(code);
                    $.jStorage.set(link, code);
                    $.jStorage.setTTL(link, 7 * 24 * 60 * 60 * 1000); // Valid for a week.
                },
                wmode: 'transparent'
            });
        }

        return true;
    },
    pathsAndValuesToHTML: function(options) {
        /* options is an object with properties:
         *
         *   displayImages: if truish, display images, else just show their URLs.
         *   displayRating: if true, convert the rating value into stars. Defaults to true.
         *   dropNamespaces: if truish, remove the leading namespace from tag paths.
         *   fetchLinks: if truish, fetch content of recognized links and display.
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
            //   id: when fetching links, this is the id of the div element to create and later update
            //   inList: if true, the value is part of a tag value that's a list. Wrap in <li> if
            //       fetching links (see below).
            //   fetchLinks: if true, links should be fetched and replaced with an embedded rendering.
            //   tagPath: the tag path
            //   value: the value to format
            //
            // The value may be the single value for a tag or may be one of several (strings)
            // in a tag value that's a list.
            //
            // If fetchLinks is true, then if the value is a link we display it as such
            // but also arrange for the content to be updated later if we manage to find
            // out more about the link. E.g., we may replace the display of the link
            // with a snapshot of the page or image it points to.  In this case, we
            // are to use the id argument in the HTML we make in order to be able to
            // find the element to later replace with updated content.
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
                    if (options.fetchLinks){
                        var cached = $.jStorage.get(value);
                        if (cached){
                            content = cached;
                        }
                        else {
                            // value is a link in and we're supposed to display it in a way that
                            // depends on the link contents, if we recognize it. Create a function
                            // that will update the <div> we're about to return.
                            callback = function(){
                                return valueUtils.scheduleLinkUpdate({
                                    id: id,
                                    inList: options.inList,
                                    link: value
                                });
                            };
                            // Wrap a formatted link value in a span with the id so it can be updated
                            // when better content becomes available.
                            content = ('<div id="' + id + '">' +
                                       valueUtils.linkToHTML({
                                           link: $('<div/>').text(value).html()
                                       }) +
                                       '</div>');
                        }
                    }
                    else {
                        // We're not fetching links.
                        content = valueUtils.linkToHTML({
                            link: $('<div/>').text(value).html()
                        });
                    }
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
                var fetchLinks = options.fetchLinks;
                if (fetchLinks){
                    var maxEntriesToShow = 6;
                }
                else {
                    var maxEntriesToShow = value.length;
                }
                if (sortLists){
                    value.sort(twitterURLRespectingCompareFunc);
                }
                var formatted = [];
                for (var j = 0; j < value.length && j < maxEntriesToShow; j++) {
                    var content = formatPrimitive({
                                      displayImages: options.displayImages,
                                      id: idPrefix + i + '-' + j,
                                      inList: true,
                                      fetchLinks: fetchLinks,
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
                                  fetchLinks: options.fetchLinks,
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
                template += '<a target="_blank" class="taglink" href="http://fluidinfo.com/about/#!/{{encodedPath}}/tagged_objects">{{path}}:</a>';
            }
            else {
                template += '{{path}}:';
            }

            template += '</span>'; // Tag name

            if (metadata){
                template += '<span class="timestamp">{{timestamp}}</span>';
            }

            template += ('</div>' +
                         '<div class="tagAndValue">{{{value}}}</div>'
            );

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
                bullet: "tagBullet.png"
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
            out += '"><a title="on">on</a></div>';
        }

        return out;
    },

    /*
     * twitter-entities.js
     * This function converts a tweet with "entity" metadata
     * from plain text to linkified HTML.
     *
     * See the documentation here: http://dev.twitter.com/pages/tweet_entities
     * Basically, add ?include_entities=true to your timeline call
     *
     * Copyright 2010, Wade Simmons
     * Licensed under the MIT license
     * http://wades.im/mons
     *
     * Requires jQuery
     */

    linkify_entities: function (tweet, externalIconSrc) {
        var escapeHTML = function (text) {
            return $('<div/>').text(text).html();
        };

        if (!(tweet.entities)) {
            return escapeHTML(tweet.text);
        }

        // This is very naive, should find a better way to parse this
        var index_map = {};

        $.each(tweet.entities.urls, function(i,entry) {
            if (entry.expanded_url){  // Twitter sometimes marks up things that aren't full URLs (like Fluidinfo.com). Skip 'em.
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                    return ('<a href="/about/#!/' + escapeHTML(entry.expanded_url) + '">' + escapeHTML(text) + '</a>' +
                            '&nbsp;' +
                            '<a target="_blank" href="' + escapeHTML(entry.url) + '"><img src="' + externalIconSrc + '"/></a>'
                           );
                }];
            }
        });

        $.each(tweet.entities.hashtags, function(i,entry) {
            index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                return ('<a href="/about/#!/' + escape('#' + entry.text) + '">' + escapeHTML(text) + '</a>' +
                        '&nbsp;' +
                        '<a target="_blank" href="http://twitter.com/search?q=' +
                        escape('#' + entry.text) + '"><img src="' + externalIconSrc + '"/></a>');
            }];
        });

        $.each(tweet.entities.user_mentions, function(i,entry) {
            index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                return ('<a title="' + escapeHTML(entry.name) + '" href="/about/#!/@' +
                        escapeHTML(entry.screen_name).toLowerCase() + '">' + escapeHTML(text) + '</a>' +
                        '&nbsp;' +
                        '<a title="' + escapeHTML(entry.name) + '" target="_blank" href="http://twitter.com/' +
                        escapeHTML(entry.screen_name) + '"><img src="' + externalIconSrc + '"/></a>');
            }];
        });

        var result = '';
        var last_i = 0;
        var i = 0;

        // iterate through the string looking for matches in the index_map
        for (i=0; i < tweet.text.length; ++i) {
            var ind = index_map[i];
            if (ind) {
                var end = ind[0];
                var func = ind[1];
                if (i > last_i) {
                    result += escapeHTML(tweet.text.substring(last_i, i));
                }
                result += func(tweet.text.substring(i, end));
                i = end - 1;
                last_i = end;
            }
        }

        if (i > last_i) {
            result += escapeHTML(tweet.text.substring(last_i, i));
        }

        return result;
    }
};

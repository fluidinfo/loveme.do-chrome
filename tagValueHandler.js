/*
 * makeTagValueHandler returns an object that can be used to make GET
 * requests to the Fluidinfo API to get tag values on a specific object.
 *
 * param options: an object with the following attributes:
 *
 *     about: the about value for the object whose tag values are wanted.
 *     session: a Fluidinfo API session.
 *
 * return: an object with the following methods on it:
 *
 *     get(options): Gets a list of tag values from the current object in Fluidinfo.
 *         The options argument should be an object containing:
 *             onError: (optional) the function to call in case of any error.
 *             onSuccess: the function to call when all values have been received.
 *             tags: the list of tags whose values are wanted.
 *
 *     remove(options): Remove a tag value from the current object in Fluidinfo.
 *         The options argument should be an object containing:
 *             onError: (optional) the function to call in case of any error.
 *             onSuccess: the function to call when all values have been received.
 *             tag: the tag whose value is to be removed.
 *
 *     set(options): Set a tag value on the current object in Fluidinfo.
 *         The options argument should be an object containing:
 *             onError: (optional) the function to call in case of any error.
 *             onSuccess: the function to call when all values have been received.
 *             tag: the tag whose value is to be set.
 *             value: the value of the tag that is to be set.
 *
 *     ignoreFutureResults(): Tell the value handler to ignore incoming
 *         results from any outstanding API calls. This should be called
 *         when the object browser has moved on to display a new object.
 */

var makeTagValueHandler = function(options){
    /*
     *  handler is the object we'll return that will allow others to make
     *  requests to Fluidinfo for tag values. Its fields:
     *
     *    about: the current about value.
     *    cache: a cache of object values, keyed by tag path.
     *    ignoring: if true, ignore the result of API calls. This is set
     *        to true when the object browser moves on to another object.
     *    inFlight: the names of tags we have outstanding requests for.
     *    session: a Fluidinfo API session.
     *    waiters: contains objects with details of success and error functions
     *        that must be called when all required tag values are received or
     *        an error occurs.
     */
    var handler = {
        about: valueUtils.lowercaseAboutValue(options.about),
        cache: {},
        fetched: {},
        ignoring: false,
        inFlight: {},
        session: options.session,
        waiters: []
    };


    /*
     * Get a list of tags and fire a given success callback
     * when the results are all known or an error callback if
     * an error occurs.
     *
     * The options object must contain:
     *
     *     onError: (Optional) A function to fire if an error occurs.
     *     onSuccess: A function to fire when the tag values are all known.
     *     tags: A list of tag paths whose values need to be
     *         fetched from Fluidinfo or the local cache.
     */
    handler.get = function(options) {

        var tagsStatus = function(tags){
            /*
             * Classify all the tags in 'tags' as either fetched or unseen. Fetched
             * means we already have the value (if any). Unseen means we've not tried to get
             * the value.  (A third category is 'in flight', but our callers don't
             * need that info so we don't return it.)
             */
            var fetched = [];
            var unseen = [];
            for (var i = 0; i < tags.length; i++){
                var tag = tags[i];
                var value = handler.fetched[tag];
                if (value !== undefined && typeof value !== 'function'){
                    fetched.push(tag);
                }
                else {
                    // It has not been fetched. Make sure it's not in flight.
                    if (handler.inFlight[tag] === undefined ||
                        typeof handler.inFlight[tag] === 'function'){
                        unseen.push(tag);
                    }
                }
            }
            return {
                fetched: fetched,
                unseen: unseen
            };
        };

        var status = tagsStatus(options.tags);

        var onSuccess = function(result){
            // Do nothing if we've moved on.
            if (handler.ignoring){
                return;
            }

            var i;
            var wantedTags = status.unseen;

            // Mark all the tags just fetched as no longer in flight, as already
            // fetched, and also add them to the value cache. Note that some
            // of the tags that were requested might not have been on the object.
            // In that case the cache will have an undefined entry for them but
            // we'll know an attempt was made to get the value from the
            // handler.fetched object.
            for (i = 0; i < wantedTags.length; i++){
                var tag = wantedTags[i];
                delete handler.inFlight[tag];
                handler.fetched[tag] = true;
                handler.cache[tag] = result.data[tag];
            }

            // Make the result data be the the full cache.
            result.data = handler.cache;

            // Look at all waiters and call those that are now
            // fully satisfied.
            for (i = 0; i < handler.waiters.length; i++){
                var waiter = handler.waiters[i];
                if (waiter !== null){
                    var waiterStatus = tagsStatus(waiter.tags);
                    if (waiterStatus.fetched.length === waiter.tags.length){
                        // All wanted tags have already been fetched. Call the
                        // onSuccess callback and remove the entry from the
                        // waiters array.
                        waiter.onSuccess(result);
                        handler.waiters[i] = null;
                    }
                }
            }
        };

        var onError = function(result){
            // Do nothing if we've moved on.
            if (handler.ignoring){
                return;
            }

            var i;
            var wantedTags = status.unseen;

            // Mark all the tags in the API call as now no longer being in flight.
            for (i = 0; i < wantedTags.length; i++){
                delete handler.inFlight[wantedTags[i]];
            }
            // Call the error function on any waiters that asked for one of the
            // tags in wantedTags.
            for (i = 0; i < handler.waiters.length; i++){
                var waiter = handler.waiters[i];
                if (waiter !== null){
                    var requestedTags = waiter.tags;
                    outerLoop:
                    for (var j = 0; j < requestedTags.length; j++){
                        var requestedTag = requestedTags[j];
                        for (var k = 0; k < wantedTags.length; k++){
                            if (requestedTag === wantedTags[k]){
                                // A requested tag was in the API call that got an error.
                                // Call its error function and set this slot of the waiters
                                // list to null.
                                if (typeof waiter.onError === 'function'){
                                    waiter.onError(result);
                                }
                                handler.waiters[i] = null;
                                // Break out 2 levels to move onto the next waiter.
                                break outerLoop;
                            }
                        }
                    }
                }
            }
        };

        if (status.fetched.length === options.tags.length){
            // All wanted tags have already been fetched. Call
            // the success callback and we're done.
            options.onSuccess({
                data: handler.cache
            });
            return;
        }

        // Add information about a new waiter.
        handler.waiters.push({
            onError: options.onError,
            onSuccess: options.onSuccess,
            tags: options.tags
        });

        // If all needed values are either already cached or in-flight,
        // there's nothing more to do. A currently in-flight request will
        // eventually see that everything we need has been fetched and
        // call the onSuccess function in the waiter we just added.
        if (status.unseen.length === 0){
            return;
        }

        // Mark the tags we need to get values for as being in flight.
        for (var i = 0; i < status.unseen.length; i++){
            handler.inFlight[status.unseen[i]] = true;
        }

        // Call Fluidinfo for any values that are unseen (i.e., not locally
        // cached and not already in-flight in another request).
        handler.session.getObject({
            about: handler.about,
            onError: onError,
            onSuccess: onSuccess,
            select: status.unseen
        });
    };

    handler.set = function(options){
        /*
         * Store a set of tag values in Fluidinfo and (if successful) in
         * the cache.
         *
         * options contains:
         *     onError: (optional) an errback function.
         *     onSuccess: (optional) a success function.
         *     tagNamesAndValues: a map of tag names to values to set.
         */

        handler.session.tag({
            about: handler.about,
            onError: function(result){
                options.onError && options.onError(result);
            },
            onSuccess: function(result){
                // Update the cache and call our caller's onSuccess function.
                var tagNamesAndValues = options.tagNamesAndValues;
                for (tagName in tagNamesAndValues){
                    if (tagNamesAndValues.hasOwnProperty(tagName)){
                        handler.cache[tagName] = tagNamesAndValues[tagName];
                        handler.fetched[tagName] = true;
                    }
                }
                options.onSuccess && options.onSuccess(result);
            },
            values: options.tagNamesAndValues
        });
    };

    handler.remove = function(options){
        /*
         * Remove tag values from Fluidinfo and (if successful) the cache.
         *
         * options contains:
         *     onError: (optional) an errback function.
         *     onSuccess: (optional) a success function.
         *     tags: a list of paths to the tags whose values should be removed.
         */

        handler.session.del({
            about: handler.about,
            onError: function(result){
                options.onError && options.onError(result);
            },
            onSuccess: function(result){
                var tags = options.tags;
                for (var i = 0; i < tags.length; i++){
                    delete handler.cache[tags[i]];
                }
                options.onSuccess && options.onSuccess(result);
            },
            tags: options.tags,
            where: 'fluiddb/about = "' + valueUtils.quoteAbout(handler.about) + '"'
        });
    };

    handler.ignoreFutureResults = function(){
        /*
         * Set a boolean which will cause the waiters attached to any
         * outstanding requests to do nothing.
         */
        handler.ignoring = true;
    };

    return handler;
};

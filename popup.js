var existingValues;

function trim(s){
    return s.replace(/^\s+|\s+$/g, '');
}

function parseFluidinfoValue(value){
    /*
     * Parse a string into one of the 5 types of values recognized by
     * Fluidinfo.
     *
     * param: value is a string
     *
     * return: a value of type
     *
     *             null | [string, string, ...] | float | bool | string
     */
    var numberRegex = /^\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?\s*$/;

    // convert empty string to null
    if (typeof value === 'undefined' || value === ''){
        return null;
    }

    // The value is a non-empty string of some sort. Check if it's a
    // list. (Found within [] and comma separated).
    if (value.match(/^\s*\[.*\]\s*$/)){
        value = trim(value);
        // Convert to Array
        var rawArray = value.slice(1, -1).split(',');
        var val = [];
        for (var i = 0; i < rawArray.length; i++){
            val.push(trim(rawArray[i]));
        }
        return val;
    }

    if (value.match(numberRegex)){
        // A number.
        return parseFloat(value);
    }

    // Boolean / null value?
    var lower = value.toLowerCase();
    if (lower === 'true' || lower === 'false'){
        return lower === 'true';
    }

    if (lower === 'null'){
        return null;
    }

    // A plain old string.
    return value;
}

function status(msg){
    var s = document.getElementById('_fi_status');
    if (s.style.visibility === 'hidden'){
        s.innerText = msg;
        s.style.visibility = 'visible';
    }
    else {
        // Status is already visible. Add to the message.
        s.innerText += ' ' + msg;
    }
}

function clearStatus(msg){
    var s = document.getElementById('_fi_status');
    s.innerText = '';
    s.style.visibility = 'hidden';
}

function save(tab, callback){
    var ok = true;
    var callbackCalled = false;
    var fluidinfoCallsMade = 0;
    var fluidinfoCallsFinished = 0;
    var setValue;
    var deleteValue;

    clearStatus();

    function runCallback(value){
        if (!callbackCalled){
            callback(value);
            callbackCalled = true;
        }
    }

    function maybeRunCallback(){
        fluidinfoCallsFinished++;
        if (!ok || fluidinfoCallsFinished === fluidinfoCallsMade){
            runCallback(ok);
        }
    }

    // Regular tag with name and value on this URL.
    var tagName1 = document.getElementById('tagName1');
    var tagValue = document.getElementById('tagValue');
    if (tagName1.value){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName1.value] = parseFluidinfoValue(tagValue.value);
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: tagNamesAndValues
        }, function(response){
            if (response.success){
                tagName1.value = '';
                tagValue.value = '';
                status('Tag saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (tagValue.value){
        status("You've set a tag value, but not a tag name.");
        ok = false;
    }

    // Keywords (tags with no value) on this URL, separated with spaces.
    var keywordsField = document.getElementById('keywords');
    var keywordsStr = trim(keywordsField.value);
    if (keywordsStr.length){
        var numberOfKeywords = 0;
        var tagNamesAndValues = {};
        var keywords = keywordsField.value.split(' ');
        var allKeywordsValid = true;
        for (var i = 0; i < keywords.length; i++){
            var keyword = trim(keywords[i]);
            if (keyword.length){
                if (/^[\w:\.-]+$/.test(keyword)){
                    // Give all keyword tags a null value (or: use the current date/time).
                    tagNamesAndValues[keyword] = null;
                    numberOfKeywords++;
                }
                else {
                    allKeywordsValid = false;
                    ok = false;
                    status("'" + keyword + "' is not a valid tag name, sorry.");
                }
            }
        }
        if (allKeywordsValid && numberOfKeywords){
            fluidinfoCallsMade++;
            chrome.extension.sendRequest({
                action: 'tag-current-url',
                tabId: tab.id,
                tagNamesAndValues: tagNamesAndValues
            }, function(response){
                if (response.success){
                    // keywordsField.value = '';
                    status('Keywords saved successfully.');
                }
                else {
                    ok = false;
                    status(response.message);
                }
                maybeRunCallback();
            });
        }
    }

    // Read this URL later?
    var readLater = document.getElementById('read-later');
    setValue = false;
    deleteValue = false;

    if (existingValues['read-later'] !== undefined){
        // There was already a value.
        if (existingValues['read-later'] !== readLater.checked){
            // And the value has changed.
            if (readLater.checked){
                setValue = true;
            }
            else {
                deleteValue = true;
            }
        }
    }
    else {
        // No existing value.
        setValue = readLater.checked;
    }

    if (setValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: { 'read-later': true }
        }, function(response){
            if (response.success){
                existingValues['read-later'] = true;
                readLater.checked = true;
                status('Read-later tag saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: ['read-later']
        }, function(response){
            if (response.success){
                delete existingValues['read-later'];
                readLater.checked = false;
                status('Read-later tag removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }

    // Like this URL?
    var like = document.getElementById('like');
    setValue = false;
    deleteValue = false;

    if (existingValues.like !== undefined){
        // There was already a value.
        if (existingValues.like !== like.checked){
            // And the value has changed.
            if (like.checked){
                setValue = true;
            }
            else {
                deleteValue = true;
            }
        }
    }
    else {
        // No existing value.
        setValue = like.checked;
    }

    if (setValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: { 'like': true }
        }, function(response){
            if (response.success){
                existingValues.like = true;
                like.checked = true;
                status('like tag saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: ['like']
        }, function(response){
            if (response.success){
                delete existingValues.like;
                like.checked = false;
                status('like tag removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }

    // Rate this URL.
    var rating = document.getElementById('rating');
    setValue = false;
    deleteValue = false;

    if (existingValues.rating !== undefined){
        // There was already a value.
        if (existingValues.rating !== rating.value){
            // And the value has changed.
            if (rating.value){
                setValue = true;
            }
            else {
                deleteValue = true;
            }
        }
    }
    else {
        // No existing value.
        setValue = rating.value;
    }

    if (setValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: { rating: parseFluidinfoValue(rating.value) }
        }, function(response){
            if (response.success){
                existingValues.rating = rating.value;
                status('Rating saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: ['rating']
        }, function(response){
            if (response.success){
                delete existingValues.rating;
                rating.value = '';
                status('rating removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }

    // Comment on this URL.
    var comment = document.getElementById('comment');
    setValue = false;
    deleteValue = false;

    if (existingValues.comment !== undefined){
        // There was already a value.
        if (existingValues.comment !== comment.value){
            // And the value has changed.
            if (comment.value){
                setValue = true;
            }
            else {
                deleteValue = true;
            }
        }
    }
    else {
        // No existing value.
        setValue = comment.value;
    }

    if (setValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: { comment: comment.value }
        }, function(response){
            if (response.success){
                existingValues.comment = comment.value;
                status('Comment saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: ['comment']
        }, function(response){
            if (response.success){
                delete existingValues.comment;
                comment.value = '';
                status('comment removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }

    // Tag any object with this URL as the value.
    var tagName2 = document.getElementById('tagName2');
    var about = document.getElementById('about');
    if (tagName2.value && about.value){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName2.value] = tab.url;
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: tagNamesAndValues,
            about: about.value
        }, function(response){
            if (response.success){
                // Update object link.
                var a = document.getElementById('_fi_thing_link');
                a.href = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(about.value);
                a.innerText = 'Visit "' + about.value + '" in Fluidinfo.';
                document.getElementById('_fi_thing').style.visibility = 'visible';
                status('URL set as tag "' + tagName2.value + '" value on object for "' + about.value + '".');
                tagName2.value = '';
                about.value = '';
            }
            else {
                ok = false;
                status(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (tagName2.value){
        document.getElementById('_fi_thing').style.visibility = 'hidden';
        status("You've set a tag name, but not filled in the thing to tag.");
        ok = false;
    }
    else if (about.value){
        document.getElementById('_fi_thing').style.visibility = 'hidden';
        status("You've told us what to tag, but not what tag name to use.");
        ok = false;
    }

    // If we hit a synchronous error or we didn't make any calls, call
    // the callback ourselves.
    if (!ok || fluidinfoCallsMade === 0){
        runCallback(ok);
    }
}

function fi_init(){
    chrome.tabs.getSelected(null, function(tab){

        document.getElementById('_fi_cancel').onclick = function(){
            // Select the current tab (which has the
            // side-effect of closing the popup).
            chrome.tabs.update(tab.id, {selected: true});
            return false;
        };

        // Get the settings from the background app & decide what to
        // do, depending on whether the user is logged in or not.
        chrome.extension.sendRequest({
            action: 'get-settings'
        }, function(settings){
            if (settings.username){
                document.getElementById('_fi_not_logged_in').style.display = 'none';
                document.getElementById('_fi_tag').style.display = '';

                // Update the URL link at the top of the popup.
                var a = document.getElementById('_fi_link');
                a.href = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(tab.url);

                // Populate the popup with known values of certain simple tags, if those
                // tags have values already on the Fluidinfo object for the URL.
                var tags = [ 'comment', 'like', 'rating', 'read-later' ];
                chrome.extension.sendRequest({
                    action: 'get-values-for-current-url',
                    tags: tags,
                    tabId: tab.id
                }, function(response){
                    if (response.success){
                        existingValues = {};
                        for (var i = 0; i < tags.length; i++){
                            var tag = tags[i];
                            var value = response.result.data[response.username + '/' + tag];
                            if (value !== undefined){
                                existingValues[tag] = value;
                                if (tag === 'comment' || tag === 'rating'){
                                    document.getElementById(tag).value = value;
                                }
                                else {
                                    document.getElementById(tag).checked = value;
                                }
                            }
                        }

                        // Set up the save function, providing it with any existing values.
                        document.getElementById('_fi_save').onclick = function(){
                            save(tab, function(status){
                                if (status){
                                    // Select the current tab (which has the
                                    // side-effect of closing the popup).
                                    chrome.tabs.update(tab.id, {selected: true});
                                }
                            });
                            return false;
                        };
                    }
                    else {
                        status(response.message);
                    }
                });
            }
            else {
                // Not logged in.
                document.getElementById('_fi_not_logged_in').style.display = '';
                document.getElementById('_fi_tag').style.display = 'none';
            }
        });
    });
}

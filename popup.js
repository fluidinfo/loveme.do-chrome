function trim(s){
    return s.replace(/^\s+|\s+$/g, '');
}

function getKeywords(fluidinfoUsername, existingValues){
    var keywords = [];
    var tagsPrefix = fluidinfoUsername + '/tags/';
    for (tagPath in existingValues){
        if (existingValues.hasOwnProperty(tagPath)){
            if (tagPath.slice(0, tagsPrefix.length) == tagsPrefix){
                keywords.push(tagPath.slice(tagsPrefix.length));
            }
        }
    }
    return keywords;
}

function displayValues(fluidinfoUsername, existingValues){
    // Populate the popup with known values of certain simple tags, if those
    // tags have values already on the Fluidinfo object for the URL.
    var tags = [ 'comment', 'like', 'rating', 'read-later' ];
    for (var i = 0; i < tags.length; i++){
        var tag = tags[i];
        var value = existingValues[fluidinfoUsername + '/' + tag];
        if (value !== undefined){
            if (tag === 'comment' || tag === 'rating'){
                document.getElementById(tag).value = value;
            }
            else {
                document.getElementById(tag).checked = value;
            }
        }
    }

    var keywords = getKeywords(fluidinfoUsername, existingValues);
    if (keywords.length){
        document.getElementById('keywords').value = keywords.join(' ');
    }
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

function save(options){
    var tab = options.tab;
    var callback = options.callback;
    var existingValues = options.existingValues;
    var fluidinfoUsername = options.fluidinfoUsername;
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
        tagNamesAndValues[fluidinfoUsername + '/' + tagName1.value] = parseFluidinfoValue(tagValue.value);
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
                console.log(response.message);
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
    var existing = getKeywords(fluidinfoUsername, existingValues);
    var existingKeywords = {};
    for (var i = 0; i < existing.length; i++){
        existingKeywords[existing[i]] = true;
    }
    var newKeywords = {};

    if (keywordsStr.length){
        var numberOfKeywords = 0;
        var tagNamesAndValues = {};
        var keywords = keywordsField.value.split(' ');
        var allKeywordsValid = true;
        for (i = 0; i < keywords.length; i++){
            var keyword = trim(keywords[i]);
            if (keyword.length){
                if (/^[\w:\.-]+$/.test(keyword)){
                    newKeywords[keyword] = true;
                    if (!existingKeywords.hasOwnProperty(keyword)){
                        // Give all keyword tags a null value.
                        tagNamesAndValues[fluidinfoUsername + '/tags/' + keyword] = null;
                        numberOfKeywords++;
                    }
                }
                else {
                    allKeywordsValid = false;
                    ok = false;
                    var msg = "'" + keyword + "' is not a valid tag name, sorry.";
                    status(msg);
                    console.log(msg);
                }
            }
        }
        // Add new keywords that didn't already exist.
        if (allKeywordsValid && numberOfKeywords){
            fluidinfoCallsMade++;
            chrome.extension.sendRequest({
                action: 'tag-current-url',
                tabId: tab.id,
                tagNamesAndValues: tagNamesAndValues
            }, function(response){
                if (response.success){
                    for (tagName in tagNamesAndValues){
                        if (tagNamesAndValues.hasOwnProperty(tagName)){
                            existingValues[tagName] = null;
                        }
                    }
                    status('Keywords saved successfully.');
                }
                else {
                    ok = false;
                    status(response.message);
                    console.log(response.message);
                }
                maybeRunCallback();
            });
        }
    }

    if (existing.length){
        // Delete pre-existing keywords that are now absent.
        var toDelete = [];
        for (i = 0; i < existing.length; i++){
            if (!newKeywords.hasOwnProperty(existing[i])){
                toDelete.push(fluidinfoUsername + '/tags/' + existing[i]);
            }
        }
        if (toDelete.length){
            fluidinfoCallsMade++;
            chrome.extension.sendRequest({
                action: 'untag-current-url',
                tabId: tab.id,
                tags: toDelete
            }, function(response){
                if (response.success){
                    var prefixLen = (fluidinfoUsername + '/tags/').length;
                    var tagNames = [];
                    for (i = 0; i < toDelete.length; i++){
                        delete existingValues[toDelete[i]];
                        tagNames.push(toDelete[i].slice(prefixLen));
                    }
                    status('Deleted keyword' + (tagNames.length > 1 ? 's' : '') +
                           ': ' + tagNames.join(' ') + '.');
                }
                else {
                    ok = false;
                    status(response.message);
                    console.log(response.message);
                }
                maybeRunCallback();
            });
        }
    }

    // Read this URL later?
    var readLater = document.getElementById('read-later');
    setValue = false;
    deleteValue = false;
    tagName = fluidinfoUsername + '/' + 'read-later';

    if (existingValues[tagName] !== undefined){
        // There was already a value.
        if (existingValues[tagName] !== readLater.checked){
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
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = true;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: tagNamesAndValues
        }, function(response){
            if (response.success){
                existingValues[tagName] = true;
                readLater.checked = true;
                status('Read-later tag saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: [tagName]
        }, function(response){
            if (response.success){
                delete existingValues[tagName];
                readLater.checked = false;
                status('Read-later tag removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }

    // Like this URL?
    var like = document.getElementById('like');
    setValue = false;
    deleteValue = false;
    tagName = fluidinfoUsername + '/' + 'like';

    if (existingValues[tagName] !== undefined){
        // There was already a value.
        if (existingValues[tagName] !== like.checked){
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
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = true;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: tagNamesAndValues
        }, function(response){
            if (response.success){
                existingValues[tagName] = true;
                like.checked = true;
                status('like tag saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: [tagName]
        }, function(response){
            if (response.success){
                delete existingValues[tagName];
                like.checked = false;
                status('like tag removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }

    // Rate this URL.
    var rating = document.getElementById('rating');
    setValue = false;
    deleteValue = false;
    tagName = fluidinfoUsername + '/' + 'rating';
    var newRating = parseFluidinfoValue(rating.value);

    if (existingValues[tagName] !== undefined){
        // There was already a value.
        if (existingValues[tagName] !== newRating){
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
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = newRating;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: tagNamesAndValues
        }, function(response){
            if (response.success){
                existingValues[tagName] = newRating;
                status('Rating saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: [tagName]
        }, function(response){
            if (response.success){
                delete existingValues[tagName];
                rating.value = '';
                status('Rating removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }

    // Comment on this URL.
    var comment = document.getElementById('comment');
    setValue = false;
    deleteValue = false;
    tagName = fluidinfoUsername + '/' + 'comment';

    if (existingValues[tagName] !== undefined){
        // There was already a value.
        if (existingValues[tagName] !== comment.value){
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
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = comment.value;
        chrome.extension.sendRequest({
            action: 'tag-current-url',
            tabId: tab.id,
            tagNamesAndValues: tagNamesAndValues
        }, function(response){
            if (response.success){
                existingValues[tagName] = comment.value;
                status('Comment saved successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }
    else if (deleteValue){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'untag-current-url',
            tabId: tab.id,
            tags: [tagName]
        }, function(response){
            if (response.success){
                delete existingValues[tagName];
                comment.value = '';
                status('comment removed successfully.');
            }
            else {
                ok = false;
                status(response.message);
                console.log(response.message);
            }
            maybeRunCallback();
        });
    }

    // Tag any object with this URL as the value.
    var tagName2 = document.getElementById('tagName2');
    var about = document.getElementById('about');
    var tagName = trim(tagName2.value);
    if (tagName && about.value){
        if (/^[\w:\.-]+$/.test(tagName)){
            var tagNamesAndValues = {};
            tagNamesAndValues[fluidinfoUsername + '/' + tagName] = tab.url;
            fluidinfoCallsMade++;
            chrome.extension.sendRequest({
                action: 'tag',
                tagNamesAndValues: tagNamesAndValues,
                about: about.value
            }, function(response){
                if (response.success){
                    // Update object link.
                    status('URL set as "' + tagName + '" on object for "' + about.value + '".');
                    tagName2.value = '';
                    about.value = '';
                }
                else {
                    ok = false;
                    status(response.message);
                    console.log(response.message);
                }
                maybeRunCallback();
            });
        }
        else {
            if (tagName.indexOf(' ') > -1){
                var msg = "You cannot have a space in the description, sorry.";
            }
            else {
                var msg = "'" + tagName2.value + "' is not a valid tag name, sorry.";
            }
            status(msg);
            console.log(msg);
            ok = false;
        }
    }
    else if (tagName2.value){
        if (/^[\w:\.-]+$/.test(tagName2.value)){
            var msg = "You've set a description, but not told us what to add the link to.";
        }
        else {
            if (tagName2.value.indexOf(' ') > -1){
                var msg = "You cannot have a space in the description, sorry.";
            }
            else {
                var msg = "'" + tagName2.value + "' is not a valid description, sorry.";
            }
        }
        status(msg);
        console.log(msg);
        ok = false;
    }
    else if (about.value){
        var msg = "You've told us what to add the link to, but not given a description.";
        status(msg);
        console.log(msg);
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

        // Get the username from the background app & decide what to
        // do, depending on whether they are logged in or not.
        chrome.extension.sendRequest({
            action: 'get-fluidinfo-username'
        }, function(fluidinfoUsername){
            if (fluidinfoUsername){
                document.getElementById('_fi_not_logged_in').style.display = 'none';
                document.getElementById('_fi_tag').style.display = '';
                chrome.extension.sendRequest({
                    action: 'get-existing-values',
                    tabId: tab.id
                }, function(response){
                    if (response.success){
                        // Show the current tag values and set up the save function.
                        displayValues(fluidinfoUsername, response.existingValues);
                        document.getElementById('_fi_save').onclick = function(){
                            save({
                                callback: function(status){
                                    if (status){
                                        // Select the current tab (this will have the
                                        // side-effect of closing the popup).
                                        chrome.tabs.update(tab.id, {selected: true});
                                    }
                                },
                                fluidinfoUsername: fluidinfoUsername,
                                tab: tab,
                                existingValues: response.existingValues
                            });
                            return false;
                        };
                    }
                    else {
                        status(response.message);
                        console.log(response.message);
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

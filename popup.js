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
    if (value === '') {
        return null;
    }

    // The value is a non-empty string of some sort. Check if it's a
    // list. (Found within [] and comma separated).
    if (value.match(/^\s*\[.*\]\s*$/)){
        value = trim(value);
        // Convert to Array
        var rawArray = value.slice(1, -1).split(',');
        var val = [];
        for (var i = 0; i < rawArray.length; i++) {
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
    if (lower === 'true' || lower === 'false') {
        return lower === 'true';
    }

    if (lower === 'null') {
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

function save(url, callback){
    var ok = true;
    var callbackCalled = false;
    var fluidinfoCallsMade = 0;
    var fluidinfoCallsFinished = 0;

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
    if (tagName1.value && tagValue.value){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName1.value] = parseFluidinfoValue(tagValue.value);
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: tagNamesAndValues,
            about: url
        }, function(response) {
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
    else if (tagName1.value){
        status("You've set a tag name, but not a tag value.");
        ok = false;
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
                action: 'tag',
                tagNamesAndValues: tagNamesAndValues,
                about: url
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
    var readLater = document.getElementById('readLater');
    if (readLater.checked){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { 'read-later': true },
            about: url
        }, function(response) {
            if (response.success){
                readLater.checked = false;
                status('Read-later tag saved successfully.');
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
    if (like.checked){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { like: true },
            about: url
        }, function(response) {
            if (response.success){
                like.checked = false;
                status('Like tag saved successfully.');
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
    if (rating.value){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { rating: parseFluidinfoValue(rating.value) },
            about: url
        }, function(response) {
            if (response.success){
                rating.value = '';
                status('Rating saved successfully.');
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
    if (comment.value){
        fluidinfoCallsMade++;
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { comment: comment.value },
            about: url
        }, function(response) {
            if (response.success){
                comment.value = '';
                status('Comment saved successfully.');
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
        tagNamesAndValues[tagName2.value] = url;
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
        document.getElementById('_fi_save').onclick = function(){
            save(tab.url, function(status){
                if (status){
                    chrome.tabs.update(tab.id, {selected: true});
                }
            });
            return false;
        };
        document.getElementById('_fi_cancel').onclick = function(){
            chrome.tabs.update(tab.id, {selected: true});
            return false;
        };

        var a = document.getElementById('_fi_link');
        a.href = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(tab.url);
    });
}

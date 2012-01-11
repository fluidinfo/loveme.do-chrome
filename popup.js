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
    // Show a non-error status message and clear it after a few seconds.
    var s = document.getElementById('_fi_status');
    s.innerText = msg;
    s.style.visibility = 'visible';
    setTimeout(function(){
        s.style.visibility = 'hidden';
    }, 3000);
}

function error(msg){
    // Show an error status message and do not clear it.
    var s = document.getElementById('_fi_status');
    s.innerText = msg;
    s.style.visibility = 'visible';
}

function save(url){
    var tagName1 = document.getElementById('tagName1');
    var tagValue = document.getElementById('tagValue');

    // Regular tag with name and value on this URL.
    if (tagName1.value && tagValue.value){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName1.value] = parseFluidinfoValue(tagValue.value);
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
                error(response.message);
            }
        });
    }
    else if (tagName1.value){
        error("You've set a tag name, but not a tag value.");
    }
    else if (tagValue.value){
        error("You've set a tag value, but not a tag name.");
    }

    // Keywords (tags with no value) on this URL.
    var keywordsField = document.getElementById('keywords');
    var keywordsStr = trim(keywordsField.value);
    if (keywordsStr.length){
        var numberOfKeywords = 0;
        var tagNamesAndValues = {};
        var keywords = keywordsField.value.split(',');
        console.log(keywords);
        for (var i = 0; i < keywords.length; i++){
            var keyword = trim(keywords[i]);
            if (/^[\w:\.-]+$/.test(keyword)){
                // Give all keywords a null value, for now (else we could use a date).
                tagNamesAndValues[keyword] = null;
                numberOfKeywords++;
            }
            else {
                error("'" + keyword + "' is not a valid tag name, sorry.");
            }
        }
        if (numberOfKeywords){
            chrome.extension.sendRequest({
                action: 'tag',
                tagNamesAndValues: tagNamesAndValues,
                about: url
            }, function(response){
                if (response.success){
                    keywordsField.value = '';
                    status('Keywords saved successfully.');
                }
                else {
                    error(response.message);
                }
            });
        }
    }

    // Read this URL later?
    var readLater = document.getElementById('readLater');
    if (readLater.checked){
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
                error(response.message);
            }
        });
    }

    // Like this URL?
    var like = document.getElementById('like');
    if (like.checked){
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
                error(response.message);
            }
        });
    }

    // Rate this URL.
    var rating = document.getElementById('rating');
    if (rating.value){
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { rating: parseFluidinfoValue(rating.value) },
            about: url
        }, function(response) {
            console.log(response);
            if (response.success){
                rating.value = '';
                status('Rating saved successfully.');
            }
            else {
                status(response.message);
            }
        });
    }

    // Comment on this URL.
    var comment = document.getElementById('comment');
    if (comment.value){
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
                status(response.message);
            }
        });
    }

    // Tag any object with this URL as the value.
    var tagName2 = document.getElementById('tagName2');
    var about = document.getElementById('about');
    if (tagName2.value && about.value){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName2.value] = url;
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
                error(response.message);
            }
        });
    }
    else if (tagName2.value){
        document.getElementById('_fi_thing').style.visibility = 'hidden';
        error("You've set a tag name, but not filled in the thing to tag.");
    }
    else if (about.value){
        document.getElementById('_fi_thing').style.visibility = 'hidden';
        error("You've told us what to tag, but not what tag name to use.");
    }
}

function fi_init(){
    var div = document.getElementById('_fi_tag');
    document.getElementById('_fi_save').onclick = function(){
        chrome.tabs.getSelected(null, function(tab){
            save(tab.url);
        });
        return false;
    };
    chrome.tabs.getSelected(null, function(tab){
        var a = document.getElementById('_fi_link');
        a.href = 'http://fluidinfo.com/about/#!/' + encodeURIComponent(tab.url);
    });
}

/*
 * This file is run each time the user clicks the Fluidinfo icon for
 * the extension.
 */

var data = [
    '<div id="_fi_tag" class="fluidinfoDiv">',
      '<a id="_fi_link" href="#" target="_blank">Visit this URL in Fluidinfo.</a>',
      '<span id="_fi_thing" style="display: none;"> | <a id="_fi_thing_link" href="#" target="_blank">#</a></span>',
      '<form>',
        '<table>',
          '<tbody>',
            // Regular tag with name and value on this URL.
            '<tr>',
              '<td>',
                'Tag this URL:',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Tag name',
                      '</td>',
                      '<td>',
                        '<input type="text" id="tagName1" />',
                      '</td>',
                    '</tr>',
                    '<tr>',
                      '<td>',
                        'Tag value',
                      '</td>',
                      '<td>',
                        '<input type="text" id="tagValue1" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

            // Keywords (tags with no value) on this URL.
            '<tr>',
              '<td>',
                'Keywords (tags with no value) for this URL:',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Keywords',
                      '</td>',
                      '<td>',
                        '<input type="text" id="keywords" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

            // Read this URL later.
            '<tr>',
              '<td>',
                'Read this URL later?',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Read later?',
                      '</td>',
                      '<td>',
                        '<input type="checkbox" id="readLater" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

            // Like this URL.
            '<tr>',
              '<td>',
                'Like this URL?',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Like:',
                      '</td>',
                      '<td>',
                        '<input type="checkbox" id="like" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

            // Rate this URL.
            '<tr>',
              '<td>',
                'Give this URL a rating',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Rating:',
                      '</td>',
                      '<td>',
                        '<input type="text" id="rating" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

            // Tag any object with this URL as the value.
            '<tr>',
              '<td>',
                'Tag something with this URL as a value.',
              '</td>',
              '<td>',
                '<table>',
                  '<tbody>',
                    '<tr>',
                      '<td>',
                        'Tag name',
                      '</td>',
                      '<td>',
                        '<input type="text" id="tagName2" />',
                      '</td>',
                    '</tr>',
                    '<tr>',
                      '<td>',
                        'Thing',
                      '</td>',
                      '<td>',
                        '<input type="text" id="about2" />',
                      '</td>',
                    '</tr>',
                  '</tbody>',
                '</table>',
              '</td>',
            '</tr>',

          '</tbody>',
        '</table>',

        '<input id="_fi_cancel" type="submit" value="Cancel" />',
        '<input id="_fi_save" type="submit" value="Save" />',
      '</form>',
      '<div id="saved"></div>',
    '</div>'
].join('');


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

function save(){
    var tagName = document.getElementById('tagName1').value;
    var tagValue = document.getElementById('tagValue1').value;

    // Regular tag with name and value on this URL.
    if (tagName && tagValue){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = parseFluidinfoValue(tagValue);
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: tagNamesAndValues,
            about: document.location.toString()
        }, function(response) {
            console.log(response);
        });
    }
    else if (tagName){
        alert("You've set a tag name, but not a tag value.");
    }
    else if (tagValue){
        alert("You've set a tag value, but not a tag name.");
    }

    // Keywords (tags with no value) on this URL.
    var keywordsStr = trim(document.getElementById('keywords').value);
    if (keywordsStr.length){
        var numberOfKeywords = 0;
        var tagNamesAndValues = {};
        var keywords = keywordsStr.split(',');
        console.log(keywords);
        for (var i = 0; i < keywords.length; i++){
            var keyword = trim(keywords[i]);
            console.log(keyword);
            if (/^[\w:\.-]+$/.test(keyword)){
                // Give all keywords a null value, for now (could use a date).
                tagNamesAndValues[keyword] = null;
                numberOfKeywords++;
            }
            else {
                alert("'" + keyword + "' is not a valid tag name, sorry.");
            }
        }
        if (numberOfKeywords){
            chrome.extension.sendRequest({
                action: 'tag',
                tagNamesAndValues: tagNamesAndValues,
                about: document.location.toString()
            }, function(response) {
                console.log(response);
            });
        }
    }

    // Read this URL later.
    var readLater = document.getElementById('readLater').value;

    if (readLater){
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { 'read-later': true },
            about: document.location.toString()
        }, function(response) {
            console.log(response);
        });
    }

    // Like this URL.
    var like = document.getElementById('like').value;

    if (like){
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { 'like': true },
            about: document.location.toString()
        }, function(response) {
            console.log(response);
        });
    }

    // Rate this URL.
    var rating = document.getElementById('rating').value;

    if (rating){
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: { 'rating': parseFluidinfoValue(rating) },
            about: document.location.toString()
        }, function(response) {
            console.log(response);
        });
    }

    // Tag any object with this URL as the value.
    tagName = document.getElementById('tagName2').value;
    var about = document.getElementById('about2').value;

    if (tagName && about){
        var tagNamesAndValues = {};
        tagNamesAndValues[tagName] = document.location.toString();
        chrome.extension.sendRequest({
            action: 'tag',
            tagNamesAndValues: tagNamesAndValues,
            about: about
        }, function(response){
            if (response.success){
                var a = $('#_fi_thing_link');
                a.attr('href', 'http://fluidinfo.com/about/#!/' + encodeURIComponent(about));
                a.text('Visit "' + about + '" in Fluidinfo.');
                $('#_fi_thing').show();
            }
            console.log(response);
        });
    }
    else if (tagName){
        $('#_fi_thing').hide();
        alert("You've set a tag name, but not filled in the thing to tag.");
    }
    else if (about){
        $('#_fi_thing').hide();
        alert("You've told us what to tag, but not what tag name to use.");
    }
}

function show(){
    var a = $('#_fi_link');
    a.attr('href', 'http://fluidinfo.com/about/#!/' +
           encodeURIComponent(document.location.toString()));
    $('#_fi_tag').show();
}

function tag(){
    var div = $('#_fi_tag');
    if (div.length){
        if (div.is(':visible')){
            div.hide();
        }
        else {
            show();
        }
    }
    else {
        // Insert the Fluidinfo div, set event handlers, and show the div.
        var e = $(data);
        $('body').prepend(e);
        div = $('#_fi_tag');
        $('#_fi_cancel').click(function(){
            div.hide();
            return false;
        });
        $('#_fi_save').click(function(){
            save();
            return false;
        });
        show();
    }
}

tag();

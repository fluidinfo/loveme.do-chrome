var _parseJSONTag = function(tag, object, about){
    /*
     * Try to parse a tag value on an object as a JSON string.
     *
     * param about: The about value of the object.
     * param object: A JS object with the Fluidinfo tags and values.
     * param tag: The name of the tag to parse.
     *
     * return: a JS object parsed from the JSON, or null if the tag
     *     value could not be parsed.
     */
    try {
        return JSON.parse(object[tag]);
    }
    catch (error){
        console.log('Could not interpret ' + tag +
                    ' tag value on object about "' + about +
                    '" as JSON: ' + error.message);
        console.log('Tag value is: ' + object[tag]);
        return null;
    }
};

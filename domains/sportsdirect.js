var _sportsDirectDivHeader = (
    '<div class="sportsdirect">' +
      '<a href="http://www.sportsdirect.com/" target="_blank">' +
        '<img id="sportsdirect-logo" src="' +
          chrome.extension.getURL('domains/sportsdirect.com.png') +
        '"/>' +
      '</a>' +
      '<br/>' +
      '<ul>'
);

var _sportsDirectDivFooter = '</ul></div>';

var renderSportsDirect = function(object, about){
    /*
     * Render content for an object that has info on sportsdirect.com.
     *
     * param about: The about value of the object.
     * param object: A JS object with the Fluidinfo tags and values.
     *
     * return: an HTML string if sports direct tags are found, else the
     *     empty string.
     */
    if (object.hasOwnProperty('sportsdirect.com/url') &&
	    object.hasOwnProperty('sportsdirect.com/title')){
		return Mustache.render((
			'<li>' +
			'<a href="{{ url }}" target="_blank">Buy {{ about }} for {{ price}}</a>' +
			'</li>'),
			{'about': about,
			 'url': object['sportsdirect.com/url'],
			 'price': object['sportsdirect.com/price']}
		);
    }
    else {
        return '';
    }
};

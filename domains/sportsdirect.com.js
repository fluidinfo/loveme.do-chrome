var sportsDirectPlugin = (function() {
    var my = {};

    var _divHeader = (
        '<div class="sportsdirect">' +
          '<a href="http://www.sportsdirect.com/" target="_blank">' +
            '<img id="sportsdirect-logo" src="' +
              chrome.extension.getURL('domains/sportsdirect.com.png') +
            '"/>' +
          '</a>' +
          '<br/>'
    );

    var _divFooter = '</div>';

    my.render = function(object, about){
        /*
         * Render content for an object that has info on sportsdirect.com.
         *
         * param about: The about value of the object.
         * param object: A JS object with the Fluidinfo tags and values.
         *
         * return: an HTML string if sports direct tags are found, else the
         *     empty string.
         */
        if (object.hasOwnProperty('sportsdirect.com/url')) {
            return Mustache.render((
                _divHeader +
                '<a href="{{ url }}" target="_blank"><img class="sportsdirect-product-img" src="{{ image }}"/>{{ title }}. {{ price }}</a>' +
                '<p>{{{ description }}}</p>' +
                '<div style="clear: both;"></div>' +
                _divFooter
            ),
            {
                'description': object['sportsdirect.com/description'],
                'image': object['sportsdirect.com/image'],
                'price': object['sportsdirect.com/price'],
                'title': object['sportsdirect.com/title'],
                'url': object['sportsdirect.com/url']
            }
            );
        }
        else {
            return '';
        }
    };

    return my;
}());

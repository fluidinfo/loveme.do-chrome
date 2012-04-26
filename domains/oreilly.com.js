var oreillyPlugin = (function() {
    var my = {};

    var _oreillyDivHeader = (
        '<div class="oreilly">' +
          '<a href="http://www.oreilly.com/" target="_blank">' +
            '<img id="oreilly-logo" src="http://oreilly.com/images/orn_logos/oralogo_bk200.gif"/>' +
          '</a>' +
          '<br/>');

    var _oreillyDivFooter = '</div>';

    var _renderAuthorBooks = function(author){
        /*
         * Produce HTML to render the books of an author.
         *
         * param author: a JS object with attributes:
         *     'related-book-covers': A list of (string) cover image URLs.
         *     'related-book-titles': A list of (string) book titles.
         *     'related-book-urls': A list of (string) book URLs.
         */
        var covers = author['related-book-covers'];
        var titles = author['related-book-titles'];
        var urls = author['related-book-urls'];
        var content = [];
        for (var i = 0; i < titles.length; i++){
            content.push(
                Mustache.render(
                    ('<a href="{{ url }}" target="_blank">' +
                     '<img class="oreilly-cover-image" src="{{ cover }}">{{ title }}</a>' +
                     '<div style="clear: both;"></div>'
                    ),
                    {
                        cover: covers[i],
                        title: titles[i],
                        url: urls[i]
                    }
                )
            );
        }
        return content.join('');
    };

    var _renderAuthor = function(author){
        /*
         * Produce HTML to render an author.
         *
         * param author: a JS object with string attributes:
         *     'biography': The author's biography.
         *     'name': The author's name.
         *     'url': The URL of the author's page on O'Reilly.
         *
         * return: an HTML string.
         */
        var nBooks = author['related-book-titles'].length;
        var bookSectionTitleTemplate = (
            '<p><a href="{{ url }}" target="_blank">{{ name }}</a>' +
            ' has written ' + nBooks + ' O\'Reilly book' +
            (nBooks == 1 ? '' : 's') + ':</p>');
        if (author.hasOwnProperty('photo')){
            var authorTemplate = (
                '<p><a href="{{ url }}" target="_blank"><img ' +
                'class="oreilly-author-image" src="{{ photo }}">' +
                '</a>{{{ biography }}}</p>' +
                '<div style="clear: both;"></div>'
            );
        }
        else {
            var authorTemplate = '<p>{{{ biography }}}</p>';
        }

        return (
            Mustache.render(authorTemplate, author) +
            Mustache.render(bookSectionTitleTemplate, author) +
            _renderAuthorBooks(author));
    };

    var _renderAuthors = function(authors){
        /*
         * Produce HTML to render a list of authors.
         *
         * param authors: a JS list of objects. Each object has attributes:
         *     'about': The about value of the author's object in Fluidinfo.
         *     'values': A JS object with Fluidinfo tags and values as its items.
         *
         * return: an HTML string.
         */
        var content = [ _oreillyDivHeader ];
        for (var i = 0; i < authors.length; i++){
            var author = authors[i];
            content.push(_renderAuthor(author));
        }
        content.push(_oreillyDivFooter);
        return content.join('');
    };

    var _renderBookAuthors = function(book){
        /*
         * Produce HTML to render the authors of a book.
         *
         * param book: a JS object with attributes:
         *     'author-names': A list of (string) author names.
         *     'author-urls': A list of (string) author URLs.
         */
        var authorNames = book['author-names'];
        var authorURLs = book['author-urls'];
        var content = [];
        for (var i = 0; i < authorNames.length; i++){
            content.push(
                Mustache.render(
                    '<a href="{{ url }}" target="_blank">{{ name }}</a>',
                    {
                        name: authorNames[i],
                        url: authorURLs[i]
                    }
                )
            );
        }
        return content.join(', ');
    };

    var _renderBook = function(book){
        /*
         * Produce HTML to render a book.
         *
         * param book: a JS object with attributes:
         *     'author-names': A list of (string) author names.
         *     'author-urls': A list of (string) author URLs.
         *     'cover': The (string) URL of the book cover image.
         *     'title': The (string) book title.
         *     'url': The (string) URL of the book's page on O'Reilly.
         *
         * return: an HTML string.
         */
        return Mustache.render(
            (
                '<a href="{{ url }}" target="_blank"><img class="oreilly-cover-image" src="{{ cover }}"/>{{ title }}</a>' +
                '<br/>' +
                'By {{{ authors }}}' +
                '<div style="clear: both;"></div>'
            ),
            {
                authors: _renderBookAuthors(book),
                cover: book.cover,
                title: book.title,
                url: book.oreillyURL
            }
        );
    };

    var _renderBooks = function(books){
        /*
         * Produce HTML to render a list of authors.
         *
         * param books: a JS list of objects. Each object has attributes:
         *     'about': The about value of the author's object in Fluidinfo.
         *     'values': A JS object with Fluidinfo tags and values as its items.
         *         Each object is expected to contain keys for:
         *             'oreilly.com/demo/author-names
         *             'oreilly.com/demo/author-urls
         *             'oreilly.com/demo/cover-small
         *             'oreilly.com/demo/title
         *             'oreilly.com/demo/title
         *
         * return: an HTML string.
         */
        var content = [ _oreillyDivHeader ];
        for (var i = 0; i < books.length; i++){
            var book = books[i].values;
            content.push(_renderBook(book));
        }
        content.push(_oreillyDivFooter);
        return content.join('');
    };

    my.render = function(object, about){
        /*
         * Render content for an object that has O'Reilly tags on it.
         *
         * param about: The about value of the object.
         * param object: A JS object with the Fluidinfo tags and values.
         *
         * return: an HTML string if O'Reilly tags are found, else the
         *     empty string.
         */
        if (object.hasOwnProperty('oreilly.com/demo/book-info')){
            var books = _parseJSONTag('oreilly.com/demo/book-info', object, about);
            if (books){
                return _renderBooks(books);
            }
        }
        else if (object.hasOwnProperty('oreilly.com/demo/author-info')){
            var author = _parseJSONTag('oreilly.com/demo/author-info', object, about);
            if (author){
                return _renderAuthors([ author ]);
            }
        }
        return '';
    };

    return my;
}());

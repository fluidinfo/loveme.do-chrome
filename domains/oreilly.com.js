var _oreillyDivHeader = (
    '<div class="oreilly">' +
      '<span id="oreilly-header">Info from</span>' +
      '<a href="http://www.oreilly.com/">' +
        '<img id="oreilly-logo" src="http://oreilly.com/images/orn_logos/oralogo_bk200.gif"/>' +
      '</a>' +
      '<br/>');

var _oreillyDivFooter = '</div>';

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
    return Mustache.render(
        (
            '<a href="{{ url }}">{{ name }}</a>' +
            '<br/>' +
            '<p>' +
            '{{ biography }}' +
            '</p>'
        ),
        author
    );
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
        var author = authors[i].values;
        content.push(
            _renderAuthor({
                name: author['oreilly.com/demo/author-name'],
                url: author['oreilly.com/demo/author-url'],
                biography: author['oreilly.com/demo/biography']
            })
        );
    }
    content.push(_oreillyDivFooter);
    return content.join('');
};

var _renderBookAuthors = function(options){
    /*
     * Produce HTML to render the authors of a book.
     *
     * param options: a JS object with attributes:
     *     'authorNames': A list of (string) author names.
     *     'authorURLs': A list of (string) author URLs.
     */
    var authorNames = options.authorNames;
    var authorURLs = options.authorURLs;
    var content = [];
    for (var i = 0; i < authorNames.length; i++){
        content.push(
            Mustache.render(
                '<a href="{{ url }}">{{ name }}</a>',
                {
                    name: authorNames[i],
                    url: authorURLs[i]
                }
            )
        );
    }
    return content.join(', ');
};

var _renderBook = function(options){
    /*
     * Produce HTML to render a book.
     *
     * param options: a JS object with attributes:
     *     'authorNames': A list of (string) author names.
     *     'authorURLs': A list of (string) author URLs.
     *     'cover': The (string) URL of the book cover image.
     *     'title': The (string) book title.
     *     'url': The (string) URL of the book's page on O'Reilly.
     *
     * return: an HTML string.
     */
    return Mustache.render(
        (
            '<a href="{{ url }}"><img class="oreilly-cover-image" src="{{ cover }}"/>{{ title }}</a>' +
            '<br/>' +
            'By {{{ authors }}}' +
            '<div style="clear: both;"></div>'
        ),
        {
            authors: _renderBookAuthors(options),
            cover: options.cover,
            title: options.title,
            url: options.url
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
        content.push(
            _renderBook({
                authorNames: book['oreilly.com/demo/author-names'],
                authorURLs: book['oreilly.com/demo/author-urls'],
                cover: book['oreilly.com/demo/cover-small'],
                title: book['oreilly.com/demo/title'],
                url: book['oreilly.com/demo/title']
            })
        );
    }
    content.push(_oreillyDivFooter);
    return content.join('');
};

var renderOReilly = function(object, about){
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
        var authors = _parseJSONTag('oreilly.com/demo/author-info', object, about);
        if (authors){
            return _renderAuthors(authors);
        }
    }
    else {
        return '';
    }
};

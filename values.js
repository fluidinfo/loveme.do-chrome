var valueUtils = {
    numberRegex: /^\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?\s*$/,
    uriRegex: /^([a-z][-+.a-z0-9]{0,11}):\/\/(.+)/i,
    lowercaseAboutValue: function(str){
        var match = this.uriRegex.exec(str);
        if (match){
            var scheme = match[1];
            var postScheme = match[2];
            var userpass = '';
            var hostport = '';
            var rest = '';
            var slash = postScheme.indexOf('/');

            if (slash > -1){
                rest = postScheme.slice(slash);
                var hierarchicalPart = postScheme.slice(0, slash);
            }
            else {
                var hierarchicalPart = postScheme;
            }

            if (hierarchicalPart){
                var at = hierarchicalPart.indexOf('@');
                if (at > -1){
                    userpass = hierarchicalPart.slice(0, at + 1);
                    hostport = hierarchicalPart.slice(at + 1);
                }
                else {
                    hostport = hierarchicalPart;
                }
            }

            return scheme.toLowerCase() + '://' + userpass + hostport.toLowerCase() + rest;
        }
        else {
            return str.toLowerCase();
        }
    },
    isChromeURL: function(url){
        return url.slice(0, 9) === 'chrome://' || url.slice(0, 18) === 'chrome-devtools://';
    },
    truncateAbout: function(about, maxLen){
        // Return a shortened form of 'about' of length at most maxLen, suitable
        // for display.
        if (valueUtils.isLink(about)){
            // Chop off useless https?:// prefix.
            var match = about.indexOf('://');
            if (match > -1 && match < 6){
                about = about.slice(match + 3);
            }
        }
        if (about.length > maxLen){
            about = about.slice(0, maxLen - 3) + '...';
        }

        return about;
    },
    quoteAbout: function(s){
        // Quote an about value to make it suitable for use in a
        // fluiddb/about = " ... " query.
        return s.replace(/\\/g, '\\\\').replace(/\"/g, '\"');
    },
    isLink: function(str){
        // Return true if str looks like an https?:// link. Don't allow < or >
        // to appear, as a simple form of preventing html tags (like <script>)
        // tricking us into thinking they're normal links.
        return /^(https?|file):\/\/[^\<\>]+$/i.test(str);
    }
};

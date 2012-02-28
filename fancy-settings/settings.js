window.addEvent('domready', function (){
    new FancySettings.initWithManifest(function (settings){
        settings.manifest.logout.addEvent('action', function (){
            settings.manifest.password.set('');
            settings.manifest.username.set('');
        });

        var checkValid = function(){
            chrome.extension.sendRequest(
                {
                    action: 'validate'
                },
                function(response){
                    if (response.success){
                        document.getElementById('credentials-valid-img').src = '../booleanTrue.png';
                        document.getElementById('credentials-valid-text').innerText = 'OK, you\'re good to go!';
                    }
                    else {
                        document.getElementById('credentials-valid-img').src = '../booleanFalse.png';
                        document.getElementById('credentials-valid-text').innerText = 'The above values are not valid.';
                    }
                }
            );
        };

        checkValid();

        settings.manifest.username.addEvent('action', function (value){
            checkValid();
        });

        settings.manifest.password.addEvent('action', function (value){
            checkValid();
        });
    });
});

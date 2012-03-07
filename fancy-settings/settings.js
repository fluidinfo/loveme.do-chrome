window.addEvent('domready', function (){
    new FancySettings.initWithManifest(function (settings){

        var showValid = function(){
            document.getElementById('credentials-valid-img').src = '../booleanTrue.png';
            document.getElementById('credentials-valid-text').innerText = 'OK, you\'re good to go!';
        };

        var showInvalid = function(){
            document.getElementById('credentials-valid-img').src = '../booleanFalse.png';
            document.getElementById('credentials-valid-text').innerText = 'The above values are not valid.';
        };

        settings.manifest.logout.addEvent('action', function (){
            settings.manifest.password.set('');
            settings.manifest.username.set('');
            chrome.extension.sendRequest({
                action: 'logout'
            });
            showInvalid();
        });

        var checkValid = function(){
            var username = settings.manifest.username.get();
            var password = settings.manifest.password.get();
            if (username.length === 0 || password.length === 0){
                showInvalid();
            }
            else {
                chrome.extension.sendRequest(
                    {
                        action: 'validate'
                    },
                    function(response){
                        if (response.success){
                            showValid();
                        }
                        else {
                            showInvalid();
                        }
                    }
                );
            }
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

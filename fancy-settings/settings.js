window.addEvent('domready', function (){
    new FancySettings.initWithManifest(function (settings){
        settings.manifest.logout.addEvent('action', function (){
            settings.manifest.password.set('');
            settings.manifest.username.set('');
        });

        settings.manifest.password.addEvent('action', function (value){
            console.log('new password value is: ' + value);
        });
    });
});

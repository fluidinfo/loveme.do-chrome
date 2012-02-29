this.manifest = {
    'name': 'Fluidinfo',
    'icon': '../fi_32.png',
    'settings': [
        {
            'tab': i18n.get('help'),
            'group': i18n.get('about'),
            'name': 'about',
            'type': 'description',
            'text': i18n.get('description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('Add info'),
            'name': 'adding',
            'type': 'description',
            'text': i18n.get('add description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('See info'),
            'name': 'see',
            'type': 'description',
            'text': i18n.get('see description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('Jump'),
            'name': 'jump',
            'type': 'description',
            'text': i18n.get('jump description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('Feedback'),
            'name': 'feedback',
            'type': 'description',
            'text': i18n.get('feedback description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('password'),
            'name': 'passwordDescription',
            'type': 'description',
            'text': i18n.get('password description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('login'),
            'name': 'credentialsDescription',
            'type': 'description',
            'text': i18n.get('credentials description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('login'),
            'name': 'username',
            'type': 'text',
            'label': i18n.get('username')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('login'),
            'name': 'password',
            'type': 'text',
            'label': i18n.get('password'),
            'masked': true
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('login'),
            'name': 'valid',
            'type': 'description',
            'text': i18n.get('valid description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('logout'),
            'name': 'logoutDescription',
            'type': 'description',
            'text': i18n.get('logout description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('logout'),
            'name': 'logout',
            'type': 'button',
            'text': i18n.get('Logout')
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Notifications'),
            'name': 'notificationDescription',
            'type': 'description',
            'text': i18n.get('notification description')
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Notifications'),
            'name': 'notificationTimeout',
            'type': 'slider',
            'label': 'Notification timeout:',
            'max': 600,
            'min': 0,
            'step': 10,
            'display': true,
            'displayModifier': function (value){
                if (value === 0){
                    return 'No timeout';
                }
                var mins = parseInt((value / 60) + '', 10);
                var secs = value % 60;
                var text = '';

                if (mins){
                    text = mins + ' minute' + (mins === 1 ? '' : 's');
                }
                if (secs){
                    if (text === ''){
                        text = secs + ' seconds';
                    }
                    else {
                        text += ', ' + secs + ' seconds';
                    }
                }
                return text;
            }
        }
    ],
    'alignment': [
        [
            'username',
            'password'
        ]
    ]
};

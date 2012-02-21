this.manifest = {
    'name': 'Fluidinfo',
    'icon': 'icon.png',
    'settings': [
        {
            'tab': i18n.get('information'),
            'group': i18n.get('about'),
            'name': 'about',
            'type': 'description',
            'text': i18n.get('description')
        },
        {
            'tab': i18n.get('login'),
            'group': i18n.get('login'),
            'name': 'passwordDescription',
            'type': 'description',
            'text': i18n.get('passwordDescription')
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
            'group': i18n.get('logout'),
            'name': 'logoutDescription',
            'type': 'description',
            'text': i18n.get('logoutDescription')
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
            'group': i18n.get('Lower case'),
            'name': 'lowercaseDescription',
            'type': 'description',
            'text': i18n.get('lowercaseDescription')
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Lower case'),
            'name': 'lowercase',
            'type': 'radioButtons',
            'label': 'For selected text and link text, offer:',
            'options': [
                ['lower', 'Just the lowercase text'],
                ['original', 'Just the original text'],
                ['both', 'Both']
            ]
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Notifications'),
            'name': 'notificationDescription',
            'type': 'description',
            'text': i18n.get('notificationDescription')
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

this.manifest = {
    'name': 'Fluidinfo',
    'icon': '../images/logo-32.png',
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
            'group': i18n.get('Add comments'),
            'name': 'adding',
            'type': 'description',
            'text': i18n.get('add description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('See comments'),
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
            'group': i18n.get('Privacy'),
            'name': 'privacy',
            'type': 'description',
            'text': i18n.get('privacy description')
        },
        {
            'tab': i18n.get('help'),
            'group': i18n.get('Feedback'),
            'name': 'feedback',
            'type': 'description',
            'text': i18n.get('feedback description')
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Sidebar'),
            'name': 'sidebarSideDescription',
            'type': 'description',
            'text': i18n.get('sidebar side description')
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Sidebar'),
            'name': 'sidebarSide',
            'type': 'radioButtons',
            'options': [
                ['left', i18n.get('left')],
                ['right', i18n.get('right')]
            ]
        },
        {
            'tab': i18n.get('options'),
            'group': i18n.get('Sidebar'),
            'name': 'sidebarWidth',
            'type': 'slider',
            'label': 'Sidebar width:',
            'max': 600,
            'min': 150,
            'step': 10,
            'display': true,
            'displayModifier': function (value){
                return parseInt(value);
            }
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
    ]
};

// Save options to localStorage and validate.
function save_options() {
    var userfield = document.getElementById('username');
    var passfield = document.getElementById('password');
    var advancedfield = document.getElementById('advanced');

    var username = userfield.value;
    var password = passfield.value;
    var advanced = advancedfield.checked;

    console.log('username = ' + userfield.value);
    console.log('pass = ' + passfield.value);

    chrome.extension.sendRequest(
        { action: 'validate',
          password: password,
          username: username
        },
        function(response) {
            console.log(response);
            var status = document.getElementById('status');
            if (response.success) {
                localStorage.username = username;
                localStorage.password = password;
                localStorage.advanced = advanced;
                if (advanced.checked){
                    chrome.browserAction.setPopup({popup: 'popup.html'});
                }
                else {
                    chrome.browserAction.setPopup({popup: ''});
                }
                // Update status to let user know options were saved.
                status.innerHTML = '<p><big>Options saved.</big></p>';
                setTimeout(function() { status.innerText = ''; }, 3000);
            }
            else {
                status.innerHTML = '<p><big>Invalid username or password.</big></p>';
            }
        });
    return false;
}

// Restores form from localStorage.
function restore_options() {
    var username = localStorage.username;
    var password = localStorage.password;
    var advanced = localStorage.advanced;
    var userfield = document.getElementById('username');
    var passfield = document.getElementById('password');
    var advancedbox = document.getElementById('advanced');

    if (username)
        userfield.value = username;
    if (password)
        passfield.value = password;
    if (advanced && JSON.parse(advanced) === true)
        advancedbox.checked = true;
}

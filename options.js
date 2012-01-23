// Check username and password and if valid, save to local storage.
function save_options(){
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    chrome.extension.sendRequest(
        { action: 'validate',
          password: password,
          username: username
        },
        function(response){
            console.log(response);
            var status = document.getElementById('status');
            if (response.success){
                localStorage.username = username;
                localStorage.password = password;
                // Let the user know options were saved.
                status.innerHTML = '<p><big>Options saved.</big></p>';
                setTimeout(function(){
                    status.innerText = '';
                }, 3000);
            }
            else {
                status.innerHTML = '<p><big>' + response.message + '</big></p>';
            }
        });
    return false;
}

// Restore login form from localStorage.
function restore_options(){
    if (localStorage.username){
        document.getElementById('username').value = localStorage.username;
    }
    if (localStorage.password){
        document.getElementById('password').value = localStorage.password;
    }
}

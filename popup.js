function login(){
    var userfield = document.getElementById('username');
    var passfield = document.getElementById('password');
    chrome.extension.sendRequest(
        {
            action: 'validate'
        },
        function(response) {
            console.log(response);
            var status = document.getElementById('status');
            if (response.success) {
                status.innerText = 'Credentials saved.';
                window.close();
            }
            else {
                status.innerText = 'Invalid username or password.';
            }
        }
    );
    return false;
}

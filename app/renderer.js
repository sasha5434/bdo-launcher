function runGame() {
    const token = document.getElementById("token").value;
    if (token !== '') {
        window.electronAPI.run(token);
    } else {
        toastr.options = {
            "debug": false,
            "positionClass": "launcher-toast-position",
            "onclick": null,
            "fadeIn": 300,
            "fadeOut": 1000,
            "timeOut": 5000,
            "extendedTimeOut": 1000
        }
        toastr.warning('Сначала нужно авторизоваться!');
    }
}

function closeLauncher() {
    window.electronAPI.close();
}

function minimizeLauncher() {
    window.electronAPI.minimize();
}

const notification = document.getElementById('notification');

function closeNotification() {
    notification.classList.add('hidden');
}

function restartApp() {
    window.electronAPI.restartApp();
}

function updateGame() {
    window.electronAPI.updateGame();
    document.getElementsByClassName('download-check').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-found').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: block');
    document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-finish').item(0).setAttribute('style', 'display: none');
    document.getElementById('update').setAttribute('disabled', 'disabled');
}

function selectFolder() {
    const folder = document.getElementById("folder").value;
    window.electronAPI.selectGameDir(folder);
}

function updateConfig() {
    const config = {
        "gameDir": document.getElementById("folder").value,
        "speedU": document.getElementById("upload").value,
        "speedD": document.getElementById("download").value
    }
    window.electronAPI.updateConfig(config);
    $('#exampleModal').modal('hide');
}

function repairClient() {
    document.getElementsByClassName('download-check').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-found').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: block');
    document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: none');
    document.getElementsByClassName('download-finish').item(0).setAttribute('style', 'display: none');
    document.getElementById('launch').setAttribute('disabled', 'disabled');
    document.getElementById('repair').setAttribute('disabled', 'disabled');
    window.electronAPI.repairClient();
    $('#exampleModal').modal('hide');
}
const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    run: (token) => ipcRenderer.invoke('run', token),
    close: () => ipcRenderer.invoke('close'),
    minimize: () => ipcRenderer.invoke('minimize'),
    restartApp: () => ipcRenderer.send('restart_app'),
    updateGame: () => ipcRenderer.invoke('start_update'),
    selectGameDir: (dir) => ipcRenderer.invoke('select_directory', dir),
    updateConfig: (config) => ipcRenderer.invoke('update_config', config),
    saveLogin: (data) => ipcRenderer.invoke('save_login', data),
    repairClient: () => ipcRenderer.invoke('repair_client')
})

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }

    ipcRenderer.send('app_version');
    ipcRenderer.on('app_version', (event, arg) => {
        ipcRenderer.removeAllListeners('app_version');
        document.getElementById('lVersion').innerText = arg.version;
    });

    const notification = document.getElementById('notification');
    const message = document.getElementById('message');
    const restartButton = document.getElementById('restart-button');

    ipcRenderer.on('update_available', () => {
        ipcRenderer.removeAllListeners('update_available');
        message.innerText = 'A new update is available. Downloading now...';
        notification.classList.remove('hidden');
    });

    ipcRenderer.on('update_downloaded', () => {
        ipcRenderer.removeAllListeners('update_downloaded');
        message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
        restartButton.classList.remove('hidden');
        notification.classList.remove('hidden');
    });
    ipcRenderer.on('verify_progress', (event, progress) => {
        document.getElementsByClassName('progress-bar').item(0).setAttribute('aria-valuenow', progress);
        document.getElementsByClassName('progress-bar').item(0).setAttribute('style', 'width:' + progress + '%');
        document.getElementsByClassName('progress-bar').item(0).classList.add("progress-bar-animated");
        document.getElementById('verify-progress').innerHTML = progress;
    });
    ipcRenderer.on('update_progress', (event, progress, speed) => {
        document.getElementsByClassName('progress-bar').item(0).setAttribute('aria-valuenow', progress);
        document.getElementsByClassName('progress-bar').item(0).setAttribute('style', 'width:' + progress + '%');
        document.getElementsByClassName('progress-bar').item(0).classList.add("progress-bar-animated");
        document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: block');
        document.getElementById('progress-percent').innerHTML = progress;
        document.getElementById('progress-speed').innerHTML = speed;
        document.getElementById('repair').setAttribute('disabled', 'disabled');
    });
    ipcRenderer.on('update_finish', (event, version) => {
        document.getElementsByClassName('progress-bar').item(0).setAttribute('aria-valuenow', 100);
        document.getElementsByClassName('progress-bar').item(0).setAttribute('style', 'width: 100%');
        document.getElementsByClassName('progress-bar').item(0).classList.remove("progress-bar-animated");
        document.getElementsByClassName('download-check').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-found').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-finish').item(0).setAttribute('style', 'display: block');
        document.getElementById('update').setAttribute('style', 'display: none');
        document.getElementById('launch').setAttribute('style', 'display: block');
        document.getElementById('repair').removeAttribute('disabled');
        document.getElementById('launch').removeAttribute('disabled');
        document.getElementById('gVersion').innerHTML = version;
    });
    ipcRenderer.on('update_found', () => {
        document.getElementsByClassName('download-check').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-found').item(0).setAttribute('style', 'display: block');
        document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-finish').item(0).setAttribute('style', 'display: none');
        document.getElementById('update').setAttribute('style', 'display: block');
        document.getElementById('launch').setAttribute('style', 'display: none');
        document.getElementById('update').removeAttribute('disabled');
    });
    ipcRenderer.on('update_notfound', () => {
        document.getElementsByClassName('download-check').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-found').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-prepare').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-progress').item(0).setAttribute('style', 'display: none');
        document.getElementsByClassName('download-finish').item(0).setAttribute('style', 'display: block');
        document.getElementById('update').setAttribute('style', 'display: none');
        document.getElementById('launch').setAttribute('style', 'display: block');
        document.getElementById('repair').removeAttribute('disabled');
    });

    ipcRenderer.on('config-loaded', (event, config) => {
        document.getElementById('folder').setAttribute('value', config.gameDir);
        document.getElementById('upload').setAttribute('value', config.speedU);
        document.getElementById('download').setAttribute('value', config.speedD);
        document.getElementById('gVersion').innerText = config.version;
        document.getElementById('email').setAttribute('value', (config.email) ? config.email : '');
        if (config.email !== undefined && config.email !== '') {
            document.getElementById('email').focus();
        }
        document.getElementById('password').setAttribute('value', (config.password) ? config.password : '');
        if (config.password !== undefined && config.password !== '') {
            document.getElementById('password').focus();
        }
        document.getElementById('auth').focus();
    })
    ipcRenderer.on('directory-selected', (event, directrory) => {
        document.getElementById('folder').setAttribute('value', directrory);
    })
})
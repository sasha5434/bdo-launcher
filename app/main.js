const fs = require('fs');
const dns = require('node:dns');
const path = require('path')
const {app, BrowserWindow, ipcMain, shell, dialog} = require('electron')
const {autoUpdater} = require('electron-updater');
const WebTorrent = require('webtorrent')
const fetch = require('node-fetch');
var events = require('events');
var eventEmitter = new events.EventEmitter();

const url = 'https://tiberium-desert.ru'

dns.setServers([
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1',
    '94.140.14.14',
    '94.140.15.15'
]);

const update = {
    client: '',
    patch: '',
    version: 0
}

function roundPlus(x, n) { //x - число, n - количество знаков
    if (isNaN(x) || isNaN(n)) return false;
    let m = Math.pow(10, n);
    return Math.round(x * m) / m;
}

function speedBeautify(speed) {
    let beautySpeed = parseInt(speed, 10)
    if (beautySpeed > 1073741824) {
        beautySpeed = roundPlus(beautySpeed / 1073741824, 2) + ' GB/s'
    } else if (beautySpeed > 1048576) {
        beautySpeed = roundPlus(beautySpeed / 1048576, 2) + ' MB/s'
    } else if (beautySpeed > 1024) {
        beautySpeed = roundPlus(beautySpeed / 1024, 2) + ' kB/s'
    } else {
        beautySpeed = beautySpeed + ' B/s'
    }
    return beautySpeed
}

const config = {
    "gameDir": path.join(__dirname, '../../../../BlackDesert'),
    "speedD": 100,
    "speedU": 100,
    "version": 0
}

const settingsDir = app.getPath('userData')

const tClient = new WebTorrent({
    downloadLimit: config.speedD * 1048576,
    uploadLimit: config.speedU * 1048576
})

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 450,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '/icon.png')
    })

    mainWindow.setMenuBarVisibility(false)

    //start page
    mainWindow.loadFile(path.join(__dirname, '/index.html'))

    //for open links
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return {action: 'deny'};
    });

    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    ipcMain.handle('minimize', () => {
        mainWindow.minimize()
    })

    ipcMain.handle('select_directory', async (event, directory) => {
        const result = await dialog.showOpenDialog({defaultPath: directory, properties: ['openDirectory']})
        if (!result.canceled) {
            mainWindow.webContents.send('directory-selected', result.filePaths[0]);
        }
    })

    ipcMain.handle('update_config', (event, data) => {
        config.gameDir = data.gameDir
        config.speedD = data.speedD
        config.speedU = data.speedU
        tClient.throttleDownload(parseInt(data.speedD, 10) * 1048576)
        tClient.throttleUpload(parseInt(data.speedU, 10) * 1048576)
        fs.writeFileSync(path.join(settingsDir, 'config.json'), JSON.stringify(config));
    })

    ipcMain.handle('save_login', (event, data) => {
        config.email = data.email
        config.password = data.password
        fs.writeFileSync(path.join(settingsDir, 'config.json'), JSON.stringify(config));
    })

    autoUpdater.on('update-available', () => {
        mainWindow.webContents.send('update_available');
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update_downloaded');
    });

    eventEmitter.on('config-loaded', async () => {
        try {
            const response = await fetch(url + '/updates', {
                method: 'GET'
            })
            const data = await response.json()
            update.client = data.client
            update.patch = data.patch
            update.version = data.version
            if (data.version > config.version) {
                mainWindow.webContents.send('update_found');
            } else {
                mainWindow.webContents.send('update_notfound');
            }
        } catch (e) {
            console.log(e)
        }
    });

    mainWindow.once('ready-to-show', () => {
        fs.stat(path.join(settingsDir, 'config.json'), function (err, stat) {
            if (err === null || err === undefined) {
                const configR = JSON.parse(fs.readFileSync(path.join(settingsDir, 'config.json'), (err, data) => (data)));
                config.gameDir = configR.gameDir
                config.speedD = parseInt(configR.speedD, 10)
                config.speedU = parseInt(configR.speedU, 10)
                config.version = parseInt(configR.version, 10)
                config.email = configR.email
                config.password = configR.password
                tClient.throttleDownload(config.speedD * 1048576)
                tClient.throttleUpload(config.speedU * 1048576)
                eventEmitter.emit('config-loaded');
                mainWindow.webContents.send('config-loaded', config);
            } else if (err.code === 'ENOENT') {
                fs.writeFileSync(path.join(settingsDir, 'config.json'), JSON.stringify(config));
                eventEmitter.emit('config-loaded');
                mainWindow.webContents.send('config-loaded', config);
            } else {
                console.log('Some other error: ', err.code);
            }
        });

        const log = require("electron-log")
        log.transports.file.level = "debug"
        autoUpdater.logger = log
        autoUpdater.checkForUpdatesAndNotify()

    });

    ipcMain.handle('start_update', () => {
        console.log('torrent download start')
        interval = setInterval(() => {
            mainWindow.webContents.send('verify_progress', Math.ceil(tClient.progress * 100));
        }, 150);
        tClient.add((config.version > 0) ? update.patch : update.client, {path: config.gameDir}, (torrent) => {
            torrent.on('done', function () {
                console.log('torrent download finished')
                config.version = update.version
                fs.writeFileSync(path.join(settingsDir, 'config.json'), JSON.stringify(config));
                if (interval) {
                    clearInterval(interval);
                }
                mainWindow.webContents.send('update_finish', update.version);
                if (tClient) {
                    tClient.remove(torrent.infoHash);
                }
            });
            if (interval) {
                clearInterval(interval);
            }
            interval = setInterval(() => {
                mainWindow.webContents.send('update_progress', Math.ceil(torrent.progress * 100), speedBeautify(torrent.downloadSpeed));
            }, 150);
        });
    })

    ipcMain.handle('repair_client', () => {
        console.log('torrent download start')
        interval = setInterval(() => {
            mainWindow.webContents.send('verify_progress', Math.ceil(tClient.progress * 100));
        }, 150);
        tClient.add(update.client, {path: config.gameDir}, (torrent) => {
            torrent.on('done', function () {
                console.log('torrent download finished')
                if (interval) {
                    clearInterval(interval);
                }
                mainWindow.webContents.send('update_finish', update.version);
                config.version = update.version
                fs.writeFileSync(path.join(settingsDir, 'config.json'), JSON.stringify(config));
                if (tClient) {
                    tClient.remove(torrent.infoHash);
                }
            });
            if (interval) {
                clearInterval(interval);
            }
            interval = setInterval(() => {
                mainWindow.webContents.send('update_progress', Math.ceil(torrent.progress * 100), speedBeautify(torrent.downloadSpeed));
            }, 150);
        });
    })
}

app.whenReady().then(() => {
    ipcMain.handle('close', () => {
        try {
            tClient.destroy();
        } catch (e) {
        }
        try {
            clearInterval(interval);
        } catch (e) {
        }
        app.quit();
    })

    ipcMain.handle('run', (event, token) => {
        var child = require('child_process').execFile;
        var runPath = path.join(config.gameDir, 'client/bin64');
        var executablePath = path.join(runPath, 'BlackDesert64.exe');
        var parameters = [token];
        var options = {
            cwd: runPath
        }

        child(executablePath, parameters, options, function (err, data) {
            console.log(err)
        });
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {version: app.getVersion()});
});

ipcMain.on('restart_app', () => {
    try {
        tClient.destroy();
    } catch (e) {
    }
    try {
        clearInterval(interval);
    } catch (e) {
    }
    autoUpdater.quitAndInstall();
});
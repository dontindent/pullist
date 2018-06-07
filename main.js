const { app, ipcMain, BrowserWindow, systemPreferences } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('./app/js/misc/pref-store');
const config = require(path.join(__dirname, 'package.json'));
const logger = require('./app/js/misc/logger');
const ipcChannels = require('./app/js/misc/ipc-channels');

let mainWindow = null;
let storageWindow = null;

const sender = 'main';

const isWindows = global.isWindows = (process.platform === 'win32');
const isMac = global.isMac = (process.platform === 'darwin');
// noinspection JSUnusedLocalSymbols
const isLinux = global.isLinux = (process.platform === 'linux');
// noinspection JSUnusedLocalSymbols
const isBSD = global.isBSD = (process.platform === 'freebsd');
// noinspection JSUnusedLocalSymbols
const isSun = global.isSun = (process.platform === 'sunos');

const store = new Store({
    configName: 'user-preferences',
    defaults: {
        windowBounds: {width: 1280, height: 800},
        latestReleaseDate: -8640000000000000,
        includeOnlyComics: true,
        includeReprints: false
    }
});

global.userPrefs = store.data;

ipcMain.on (ipcChannels.prefGet, function(event, message) {
    let key = message;
    let value = store.get(key);
    logger.log('Getting preferences for: \'' + key + '\': ' + value, sender);
    event.sender.send(ipcChannels.prefGetSuccess, { key: key, value: value });
}.bind(this));

ipcMain.on (ipcChannels.prefSet, function(event, message) {
    let { key, value } = message;
    logger.log('Setting preferences for \'' + key + '\': ' + value, sender);
    store.set(key, value);
    event.sender.send(ipcChannels.prefSetSuccess, store.get(key));
}.bind(this));

ipcMain.on (ipcChannels.prefDelete, function(event, message) {
    let key = message;
    logger.log('Deleting preferences for: \'' + key + '\'', sender);
    let value = store.delete(key);
    event.sender.send(ipcChannels.prefDeleteSuccess, { key: key, value: value });
}.bind(this));


ipcMain.on (ipcChannels.getAccentColor, function (event) {
    event.sender.send(ipcChannels.accentColorChanged, systemPreferences.getAccentColor());
}.bind(this));

if (isWindows) {
    systemPreferences.on('accent-color-changed', function (event, newColor) {
        mainWindow.webContents.send(ipcChannels.accentColorChanged, newColor);
    });
}

app.setName(config.productName);

function createWindows (width, height) {
    // Create the browser window.
    global.mainWindow = mainWindow = new BrowserWindow({
        frame: false,
        title: config.productName,
        width: width,
        height: height,
        minWidth: 1024,
        minHeight: 800,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            nativeWindowOpen: true
        }
    });

    // Create a hidden window to be used for asynchronous storage calls
    global.storageWindow = storageWindow = new BrowserWindow({
        title: 'Storage',
        show: false
    });

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/index.html'),
        protocol: 'file:',
        slashes: true
    }));

    storageWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/storage_window.html'),
        protocol: 'file',
        slashes: true
    }));

    mainWindow.webContents.openDevTools({mode: 'undocked'});
    storageWindow.webContents.openDevTools({mode: 'undocked'});

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', function(event) {

    });

    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
        storageWindow.close();
        storageWindow = null;
    });

    mainWindow.on('resize', () => {
        let { width, height } = mainWindow.getBounds();
        store.set('windowBounds', { width, height });
    });

    // noinspection JSUnusedLocalSymbols
    mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
        if (frameName === 'confirm') {
            // Open window as modal
            event.preventDefault();

            delete options['x'];
            delete options['y'];
            delete options['minWidth'];
            delete options['minHeight'];

            Object.assign(options, {
                parent: mainWindow,
                frame: false,
                resizable: false,
                width: 680,
                height: 190,
                modal: true,
                movable: true,
                show: false,
            });

            let window = new BrowserWindow(options);

            // window.webContents.openDevTools({mode: 'undocked'});

            window.loadURL(url);

            window.once('ready-to-show', () => {
                window.show();
            });

            event.newGuest = window;
        }
    });
}

app.on('ready', function () {
    let { width, height } = store.get('windowBounds');
    createWindows(width, height);

    if (isWindows) {
        logger.log(systemPreferences.getColor('window-frame'), sender);
        logger.log(systemPreferences.getColor('active-border'), sender);

        mainWindow.webContents.send('accentColorChanged', systemPreferences.getAccentColor());
    }
});

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow == null) {
        createWindows();
    }
});

app.commandLine.appendSwitch('remote-debugging-port', '9222');

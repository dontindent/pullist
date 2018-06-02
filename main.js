const {app, ipcMain, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const Store = require('./app/js/misc/store');
const config = require(path.join(__dirname, 'package.json'));

let mainWindow = null;
let storageWindow = null;

const store = new Store({
    configName: 'user-preferences',
    defaults: {
        windowBounds: {width: 1280, height: 800},
        latestReleaseDate: -8640000000000000,
        includeOnlyComics: true
    }
});

global.userPrefs = store.data;

ipcMain.on ('prefGet', function(event, message) {
    let key = message;
    console.log('Getting preferences for:  ' + key);
    let value = store.get(key);
    event.sender.send('prefGetSuccess', { key: key, value: value });
}.bind(this));

ipcMain.on ('prefSet', function(event, message) {
    let { key, value } = message;
    console.log('Setting preferences for \'' + key + '\':' +  value);
    store.set(key, value);
    event.sender.send('prefSetSuccess', store.get(key));
}.bind(this));

ipcMain.on ('prefDelete', function(event, message) {
    let key = message;
    console.log('Deleting preferences for:  ' + key);
    let value = store.delete(key);
    event.sender.send('prefDeleteSuccess', { key: key, value: value });
}.bind(this));

app.setName(config.productName);

function createWindow (width, height) {
    // Create the browser window.
    global.mainWindow = mainWindow = new BrowserWindow({
        frame: false,
        title: config.productName,
        width: width,
        height: height,
        minWidth: 1024,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    global.storageWindow = storageWindow = new BrowserWindow({
        title: 'Storage',
        show: true
    });

    mainWindow.setMenuBarVisibility(false);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/index.html'),
        protocol: 'file:',
        slashes: true
    }));

    storageWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/storageWindow.html'),
        protocol: 'file',
        slashes: true
    }));

    mainWindow.webContents.openDevTools();
    storageWindow.webContents.openDevTools();

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
}

app.on('ready', function () {
    let { width, height } = store.get('windowBounds');
    createWindow(width, height);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow == null) {
        createWindow();
    }
});

app.commandLine.appendSwitch('remote-debugging-port', '9222');

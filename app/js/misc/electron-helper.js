const { clipboard, remote, screen, ipcRenderer } = require('electron');
const { Menu, MenuItem } = remote;
const path = require('path');
const url = require('url');


// I'm sure theres a more elegant way to do this, but this allows electron functionality to be passed in
// via dependency injection, which makes testing easier, probably
class ElectronHelper {
    constructor () {
        this._window = null;
    }
    
    get clipboard () {
        return clipboard;
    }
    
    get ipcRenderer () {
        return ipcRenderer;
    }

    get Menu () {
        return Menu;
    }

    get MenuItem () {
        return MenuItem;
    }
    
    get remote () {
        return remote;
    }
    
    get screen () {
        return screen;
    }

    get window () {
        return remote.getCurrentWindow();
    }

    getGlobal (value) {
        return remote.getGlobal(value);
    }
}

exports = module.exports = ElectronHelper;
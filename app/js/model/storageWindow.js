const { remote, ipcRenderer } = require('electron');
const ComicDatabase = require('../misc/database-manager');

const mainWindow = remote.getGlobal ('mainWindow');

class StorageWindow {
    constructor () {
        this.dbManager = new ComicDatabase();
        this.storeQueue = [];
        this.dbCloseTimer = null;
        this.init();
    }

    init() {
        this.storageReadyHandler = StorageWindow.storageReady.bind(this);
        this.storageRequestHandler = this.storageRequest.bind(this);
        this.loadRequestHandler = this.loadRequest.bind(this);
        this.deleteRequestHandler = this.deleteRequest.bind(this);

        this.dbManager.storageReady.attach(this.storageReadyHandler);

        ipcRenderer.on ('storageRequest', this.storageRequestHandler );
        ipcRenderer.on ('loadRequest', this.loadRequestHandler );
        ipcRenderer.on ('deleteRequest', this.deleteRequestHandler );

        this.dbManager.initDB();
    }

    static sendMessage (channel, message) {
        try {
            if (mainWindow) {
                mainWindow.webContents.send(channel, message);
            }
        } catch (error) {
            console.log('storageWindow: Error sending message');
            StorageWindow.sendMessage(channel, message);
        }
    }

    static sendStorageResponse (comic) {
        StorageWindow.sendMessage('storageResponse', comic);
    }

    // noinspection JSUnusedLocalSymbols
    static storageReady (sender, args) {
        StorageWindow.sendMessage('storageReady', null);
    }

    storageRequest (event, comic) {
        comic.releaseDate = new Date(comic.releaseDate).valueOf();

        this.storeQueue.push(comic);

        // console.log('storageWindow storing: ' + comic.originalString);

        if (this.storeQueue.length === 1) {
            this.processStoreQueue();
        }
    }

    processStoreQueue () {
        if (this.storeQueue.length) {
            let comic = this.storeQueue.shift();
            let storageWindow = this;

            this.dbManager.getComicByOriginal(comic.originalString, function (result) {
                if (result) {
                    comic.id = result['Id'];
                    console.log('storageWindow updating: ' + comic.originalString);
                    storageWindow.dbManager.updateComic(comic, storageWindow.storeComplete.bind(storageWindow));
                } else {
                    console.log('storageWindow inserting: ' + comic.originalString);
                    storageWindow.dbManager.insertComic(comic, storageWindow.storeComplete.bind(storageWindow));
                }
            });

        } else {
            if (this.dbCloseTimer) {
                clearTimeout(this.dbCloseTimer);
            }

            this.dbCloseTimer = setTimeout(function() {
                this.dbManager.closeDB();
            }.bind(this), 500);
        }
    }

    storeComplete (comic) {
        StorageWindow.sendStorageResponse(comic);

        console.log('\tstorageWindow stored:', comic.originalString);

        this.processStoreQueue();
    }

    loadRequest (event, message) {
        let date;

        if(typeof message === 'number') date = message;
        else date = new Date(message).valueOf();

        console.log('Got load request for:', date);

        this.dbManager.getComicsByDate(date, this.loadComplete.bind(this));
    }

    // noinspection JSMethodCanBeStatic
    loadComplete (comics) {
        StorageWindow.sendMessage('loadResponse', comics);
    }

    deleteRequest (event, message) {
        let date;

        if(typeof message === 'number') date = message;
        else date = new Date(message).valueOf();

        console.log('Got delete request for all except:', date);

        this.dbManager.deleteOldUnpulled(date, this.deleteComplete.bind(this));
    }

    // noinspection JSMethodCanBeStatic
    deleteComplete (status) {
        StorageWindow.sendMessage('deleteResponse', status);
    }
}

// noinspection JSUnusedLocalSymbols
let storageWindow = new StorageWindow();
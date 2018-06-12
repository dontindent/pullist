//@ts-check

const { remote, ipcRenderer } = require('electron');
const ComicDatabase = require('./database-manager');
let ipcChannels = require('../../misc/ipc-channels');

const logger = require('../../misc/logger');
const mainWindow = remote.getGlobal ('mainWindow');
const caller = 'StorageWindow';

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
        this.loadLastRequestHandler = this.loadLastRequest.bind(this);
        this.deleteRequestHandler = this.deleteRequest.bind(this);
        this.datesRequestHandler = this.datesRequest.bind(this);

        this.dbManager.storageReady.attach(this.storageReadyHandler);

        ipcRenderer.on (ipcChannels.storeRequest, this.storageRequestHandler);
        ipcRenderer.on (ipcChannels.loadRequest, this.loadRequestHandler);
        ipcRenderer.on (ipcChannels.loadLastRequest, this.loadLastRequestHandler);
        ipcRenderer.on (ipcChannels.deleteRequest, this.deleteRequestHandler);
        ipcRenderer.on (ipcChannels.datesRequest, this.datesRequestHandler);

        this.dbManager.initDB();
    }

    // eslint-disable-next-line no-unused-vars
    // noinspection JSUnusedLocalSymbols
    static storageReady (sender, args) {
        sendMessage(ipcChannels.storageReady, args);
    }

    storageRequest (event, comic) {
        comic.releaseDate = new Date(comic.releaseDate).valueOf();

        this.storeQueue.push(comic);

        // console.log('StorageWindow storing: ' + comic.originalString);

        if (this.storeQueue.length === 1) {
            this.processStoreQueue();
        }
    }

    processStoreQueue () {
        if (this.storeQueue.length) {
            let comic = this.storeQueue.shift();
            let storageWindow = this;

            let queryResult = function (result) {
                if (result) {
                    comic.id = result.Id;
                    logger.log(['StorageWindow updating:', comic.originalString], caller);
                    storageWindow.dbManager.updateComic(comic, storageWindow.storeComplete.bind(storageWindow));
                } else {
                    logger.log(['StorageWindow inserting:',comic.originalString], caller);
                    storageWindow.dbManager.insertComic(comic, storageWindow.storeComplete.bind(storageWindow));
                }
            };

            if (comic.id) {
                this.dbManager.getComicById(comic.id, queryResult);
            }
            else {
                let date = comic.releaseDate;

                if(typeof date !== typeof 1) date = new Date(date).valueOf();

                this.dbManager.getComicByOriginalAndDate(comic.originalString, date, queryResult);
            }

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
        sendMessage(ipcChannels.storeResponse, comic);

        logger.log(['StorageWindow stored:', comic.originalString], caller);

        this.processStoreQueue();
    }

    // noinspection JSUnusedLocalSymbols
    // eslint-disable-next-line no-unused-vars
    datesRequest (event, message) {
        logger.log([ 'Got request to retrieve all available dates' ], caller);

        this.dbManager.getAllDates(this.datesComplete.bind(this));
    }

    // noinspection JSMethodCanBeStatic
    datesComplete (dates) {
        sendMessage(ipcChannels.datesResponse, dates);
    }

    loadRequest (event, message) {
        let date;

        if(typeof message === 'number') date = message;
        else date = new Date(message).valueOf();

        logger.log(['Got load request for:', date], caller);

        this.dbManager.getComicsByDate(date, this.loadComplete.bind(this));
    }

    // noinspection JSMethodCanBeStatic
    loadComplete (comics) {
        sendMessage(ipcChannels.loadResponse, comics);
    }

    loadLastRequest (event, message) {
        let { series, number } = message;

        logger.log([ 'Got load last pulled request for:', series, 'where number !=', number ], caller);

        this.dbManager.getLastComicBySeriesAndNumber(series, number, this.loadLastComplete.bind(this));
    }

    loadLastComplete (comic) {
        sendMessage(ipcChannels.loadLastResponse, comic);
    }

    deleteRequest (event, message) {
        let date;

        if(typeof message === 'number') date = message;
        else date = new Date(message).valueOf();

        logger.log(['Got delete request for all except:', date], caller);

        this.dbManager.deleteOldUnpulled(date, this.deleteComplete.bind(this));
    }

    // noinspection JSMethodCanBeStatic
    deleteComplete (status) {
        sendMessage(ipcChannels.deleteResponse, status);
    }
}

function sendMessage (channel, message) {
    try {
        if (mainWindow) {
            mainWindow.webContents.send(channel, message);
        }
    } catch (error) {
        logger.log('StorageWindow: Error sending IPC message', caller);
        sendMessage(channel, message);
    }
}


// noinspection JSUnusedLocalSymbols
let storageWindow = new StorageWindow(); // eslint-disable-line no-unused-vars
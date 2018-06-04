const { remote, ipcRenderer } = require('electron');
const Event = require('../../misc/event-dispatcher');
const ipcChannels = require('../../misc/ipc-channels');

const storageWindow = remote.getGlobal ('storageWindow');
const logger = require('../../misc/logger');

const caller = 'StorageInterface';

class StorageInterface {
    constructor () {
        this._storageQueue = [];
        this._storageCallbacksByOriginal = {};
        this._loadCallback = null;
        this._deleteCallback = null;
        this.storageReady = false;
        this._storeInProgress = false;

        this.createEvents();
        this.setupHandlers();
        this.enable();
    }

    createEvents () {
        this.storageReadyEvent = new Event(this);
        this.storageUnstableEvent = new Event(this);
        this.storageStableEvent = new Event(this);

    }

    setupHandlers () {
        this.storageReadyHandler = this.storageReadyFunction.bind(this);
        this.storageResponseHandler = this.storageResponse.bind(this);
        this.loadResponseHandler = this.loadResponse.bind(this);
        this.deleteResponseHandler = this.deleteResponse.bind(this);
    }

    enable () {
        ipcRenderer.on (ipcChannels.storageReady, this.storageReadyHandler);

        ipcRenderer.on (ipcChannels.storeResponse, this.storageResponseHandler);
        ipcRenderer.on (ipcChannels.loadResponse, this.loadResponseHandler);
        ipcRenderer.on (ipcChannels.deleteResponse, this.deleteResponseHandler);
    }

    storageReadyFunction () {
        this.storageReady = true;
        this.storageReadyEvent.notify();
    }

    sendStorageRequest (comic, callback) {
        this.storageUnstableEvent.notify();

        this._storageQueue.push(comic);
        this._storageCallbacksByOriginal[comic.originalString] = callback;

        this.processStorageQueue();
    }

    processStorageQueue() {
        if (!this._storeInProgress) {
            let comicToStore = this._storageQueue.shift();

            logger.log(['Sending store request for:', comicToStore.originalString], caller);
            storageWindow.webContents.send(ipcChannels.storeRequest, comicToStore);
            this._storeInProgress = true;
        }
    }

    sendLoadRequest(date, callback) {
        if (this._loadCallback) return false;

        this._loadCallback = callback;

        logger.log(['Sending load request for comics from:', date], caller);
        storageWindow.webContents.send(ipcChannels.loadRequest, date);

        return true;
    }

    sendDeleteRequest(date, callback) {
        this._deleteCallback = callback;

        logger.log(['Sending delete request for comics not from:', date], caller);
        storageWindow.webContents.send(ipcChannels.deleteRequest, date);
    }

    storageResponse (event, message) {
        let comicRemote = message;
        let callback = this._storageCallbacksByOriginal[comicRemote.originalString];

        logger.log(['Storage complete for',comicRemote.originalString], caller);

        if (typeof callback === 'function') callback(comicRemote);

        let storedComic = this._storageQueue.find(comic => comic.originalString === comicRemote.originalString);
        let index = this._storageQueue.indexOf(storedComic);
        if (index !== -1) this._storageQueue.splice(index, 1);

        this._storeInProgress = false;

        if (!this._storageQueue.length) {
            this.storageStableEvent.notify();
        }
        else {
            logger.log([this._storageQueue.length, 'comics remaining in storage queue'], caller);
            this.processStorageQueue();
        }
    }

    loadResponse (event, message) {
        logger.log('\tLoad complete', caller);
        if (typeof this._loadCallback === 'function') this._loadCallback(message);
    }


    deleteResponse (event, message) {
        if (typeof this._deleteCallback === 'function') this._deleteCallback(message);
    }
}

const storageInterface = new StorageInterface();
// Object.freeze(storageInterface);

exports = module.exports = storageInterface;
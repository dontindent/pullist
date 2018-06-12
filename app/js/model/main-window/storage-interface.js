//@ts-check

const { remote, ipcRenderer } = require('electron');
const Event = require('../../misc/event-dispatcher');
const ipcChannels = require('../../misc/ipc-channels');
// eslint-disable-next-line no-unused-vars
const Utilities = require('../../misc/utilities');

const storageWindow = remote.getGlobal ('storageWindow');
const logger = require('../../misc/logger');

class StorageInterface {
    constructor () {
        this.callerString = 'StorageInterface';
        this._storageQueue = [];
        this._storageCallbacksByOriginal = {};
        this._loadCallbacks = [];
        this._loadCallback = null;
        this._deleteCallback = null;
        this._datesCallback = null;
        this._storeInProgress = false;
        this.storageReady = false;

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
        this.loadLastResponseHandler = this.loadLastResponse.bind(this);
        this.deleteResponseHandler = this.deleteResponse.bind(this);
        this.datesResponseHandler = this.datesResponse.bind(this);
    }

    enable () {
        ipcRenderer.on(ipcChannels.storageReady, this.storageReadyHandler);

        ipcRenderer.on(ipcChannels.storeResponse, this.storageResponseHandler);
        ipcRenderer.on(ipcChannels.loadResponse, this.loadResponseHandler);
        ipcRenderer.on(ipcChannels.loadLastResponse, this.loadLastResponseHandler);
        ipcRenderer.on(ipcChannels.deleteResponse, this.deleteResponseHandler);
        ipcRenderer.on(ipcChannels.datesResponse, this.datesResponseHandler);
    }

    storageReadyFunction () {
        this.storageReady = true;
        this.storageReadyEvent.notify(null);
    }

    sendStorageRequest (comic, callback) {
        this.storageUnstableEvent.notify(null);

        this._storageQueue.push(comic);
        this._storageCallbacksByOriginal[comic.originalString] = callback;

        this.processStorageQueue();
    }

    processStorageQueue() {
        if (!this._storeInProgress) {
            let comicToStore = this._storageQueue.shift();

            // console.log(comicToStore);
            logger.log(['Sending store request for:', comicToStore.originalString], this.callerString);
            storageWindow.webContents.send(ipcChannels.storeRequest, comicToStore);
            this._storeInProgress = true;
        }
    }

    sendDatesRequest (callback) {
        // if (this._loadCallback) return false;

        this._datesCallback = callback;

        logger.log([ 'Sending request for all available dates' ], this.callerString);
        storageWindow.webContents.send(ipcChannels.datesRequest, null);

        return true;
    }

    sendLoadRequest(date, callback) {
        // if (this._loadCallback) return false;

        this._loadCallbacks.push(callback);
        this._loadCallback = callback;

        logger.log([ 'Sending load request for comics from:', new Date(date) ], this.callerString);
        storageWindow.webContents.send(ipcChannels.loadRequest, date);

        return true;
    }

    sendLoadLastPulledRequest(series, number, callback) {
        // if (this._loadCallback) return false;

        this._loadCallbacks.push(callback);
        this._loadCallback = callback;

        logger.log([ 'Sending load request for previous comic to', series, number ], this.callerString);
        storageWindow.webContents.send(ipcChannels.loadLastRequest, { series: series, number: number });

        return true;
    }

    sendDeleteRequest(date, callback) {
        this._deleteCallback = callback;

        logger.log([ 'Sending delete request for comics not from:', date ], this.callerString);
        storageWindow.webContents.send(ipcChannels.deleteRequest, date);
    }

    storageResponse (event, message) {
        let comicRemote = message;
        let callback = this._storageCallbacksByOriginal[comicRemote.originalString];

        logger.log(['Storage complete for',comicRemote.originalString], this.callerString);

        if (typeof callback === 'function') callback(comicRemote);

        let storedComic = this._storageQueue.find(comic => comic.originalString === comicRemote.originalString);
        let index = this._storageQueue.indexOf(storedComic);
        if (index !== -1) this._storageQueue.splice(index, 1);

        this._storeInProgress = false;

        if (!this._storageQueue.length) {
            this.storageStableEvent.notify(null);
        }
        else {
            logger.log([this._storageQueue.length, 'comics remaining in storage queue'], this.callerString);
            this.processStorageQueue();
        }
    }

    datesResponse (event, retrievedDates) {
        logger.log('Date retrieval complete', this.callerString);

        let dates = [];
        for (let dateObject of retrievedDates) {
            dates.push(new Date(dateObject.ReleaseDate));
        }

        if (typeof this._datesCallback === 'function') {
            let callback = this._datesCallback;
            this._datesCallback = null;
            callback(dates);
        }
    }

    loadResponse (event, message) {
        logger.log('Load complete', this.callerString);
        let callback = this._loadCallbacks.shift();

        if (typeof callback === typeof this.loadResponse) {
            callback(message);
        }
    }

    loadLastResponse (event, message) {
        logger.log('Load last comic complete', this.callerString);        
        let callback = this._loadCallbacks.shift();

        if (typeof callback === typeof this.loadResponse) {
            callback(message);
        }
    }

    deleteResponse (event, message) {
        logger.log('Delete complete', this.callerString);
        if (typeof this._deleteCallback === 'function') {
            let callback = this._datesCallback;
            this._datesCallback = null;
            callback(message);
        }
    }
}

const storageInterface = new StorageInterface();
// Object.freeze(storageInterface);

exports = module.exports = storageInterface;
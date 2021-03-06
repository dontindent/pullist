const Event = require('../../misc/event-dispatcher');
const ipcChannels = require('../../misc/ipc-channels');
// eslint-disable-next-line no-unused-vars
const Utilities = require('../../misc/utilities');
const logger = require('../../misc/logger');

class StorageInterface {
    constructor (electronHelper) {
        this._datesCallback = null;
        this._deleteCallback = null;
        this._electronHelper = electronHelper;
        this._ipcRenderer = this._electronHelper.ipcRenderer;
        this._loadCallbacks = [];
        this._storageCallbacksByOriginal = {};
        this._storageQueue = [];
        this._storageWindow = this._electronHelper.getGlobal('storageWindow');
        this._storeInProgress = false;
        this.callerString = 'StorageInterface';
        this.storageReady = false;

        this.createEvents();
        this.setupHandlers();
        this.enable();
    }

    // #region Setup

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
        this._ipcRenderer.on(ipcChannels.storageReady, this.storageReadyHandler);

        this._ipcRenderer.on(ipcChannels.storeResponse, this.storageResponseHandler);
        this._ipcRenderer.on(ipcChannels.loadResponse, this.loadResponseHandler);
        this._ipcRenderer.on(ipcChannels.loadLastResponse, this.loadLastResponseHandler);
        this._ipcRenderer.on(ipcChannels.deleteResponse, this.deleteResponseHandler);
        this._ipcRenderer.on(ipcChannels.datesResponse, this.datesResponseHandler);
    }

    // #endregion

    get storeInProgress () { 
        return this._storeInProgress;
    }

    set storeInProgress (value) {
        if (this._storeInProgress !== value ) {
            this._storeInProgress = value;

            if (this._storeInProgress === true) {
                this.storageUnstableEvent.notify(null);
                this._ipcRenderer.send(ipcChannels.storageStability, false);
            }
            // else {
            //     this.storageStableEvent.notify(null);
            // }
        }
    }

    storageReadyFunction () {
        this.storageReady = true;
        this.storageReadyEvent.notify(null);
    }

    sendStorageRequest (comic, callback) {
        this._storageQueue.push(comic);
        this._storageCallbacksByOriginal[comic.originalString] = callback;

        this.processStorageQueue();
    }

    processStorageQueue () {
        if (!this.storeInProgress) {
            let comicToStore = prepComicForSend(this._storageQueue.shift());

            logger.log([ 'Sending store request for:', comicToStore.originalString ], this.callerString);
            this._storageWindow.webContents.send(ipcChannels.storeRequest, comicToStore);
            this.storeInProgress = true;
        }
    }

    sendDatesRequest (callback) {
        this._datesCallback = callback;

        logger.log([ 'Sending request for all available dates' ], this.callerString);
        this._storageWindow.webContents.send(ipcChannels.datesRequest, null);

        return true;
    }

    sendLoadRequest (date, callback) {
        this._loadCallbacks.push(callback);

        logger.log([ 'Sending load request for comics from:', new Date(date) ], this.callerString);
        this._storageWindow.webContents.send(ipcChannels.loadRequest, date);

        return true;
    }

    sendLoadLastPulledRequest (series, number, callback) {
        this._loadCallbacks.push(callback);

        logger.log([ 'Sending load request for previous comic to', series, number ], this.callerString);
        this._storageWindow.webContents.send(ipcChannels.loadLastRequest, { series: series, number: number });

        return true;
    }

    sendDeleteRequest (date, callback) {
        this._deleteCallback = callback;

        logger.log([ 'Sending delete request for comics not from:', date ], this.callerString);
        this._storageWindow.webContents.send(ipcChannels.deleteRequest, date);
    }

    storageResponse (event, message) {
        let comicRemote = message;
        let callback = this._storageCallbacksByOriginal[comicRemote.originalString];

        logger.log(['Storage complete for',comicRemote.originalString], this.callerString);

        if (typeof callback === 'function') callback(comicRemote);

        let storedComic = this._storageQueue.find(comic => comic.originalString === comicRemote.originalString);
        let index = this._storageQueue.indexOf(storedComic);
        if (index !== -1) this._storageQueue.splice(index, 1);

        this.storeInProgress = false;

        if (!this._storageQueue.length) {
            this.storageStableEvent.notify(null);
            this._ipcRenderer.send(ipcChannels.storageStability, true);
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
            let callback = this._deleteCallback;
            this._deleteCallback = null;
            callback(message);
        }
    }
}

function prepComicForSend (comic) {
    let cloneComic = Object.assign({}, comic);
    delete cloneComic._storageInterface;

    return cloneComic;
}

// const storageInterface = new StorageInterface();
// Object.freeze(storageInterface);

exports = module.exports = StorageInterface;
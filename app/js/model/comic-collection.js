const { remote, ipcRenderer } = require('electron');
const Event = require('../misc/event-dispatcher');
const Comic = require('./comic');
const Utilities = require('../misc/utilities');

const storageWindow = remote.getGlobal ('storageWindow');
const userPrefs = remote.getGlobal('userPrefs');

class ComicCollection {
    constructor (comicService) {
        this._comicService = comicService;
        this._storageReady = false;
        this._loadQueued = false;
        this._comicDict = {};
        this._comicsByPublisher = {};
        this._comicsByOriginal = {};
        this._storageQueue = [];
        this.latestDate = null;

        this.latestDateUpdatedEvent = new Event(this);
        this.retrievedComicsEvent = new Event(this);
        this.comicListProcessedEvent = this._comicService.comicListProcessedEvent;
        this.comicProcessedEvent = this._comicService.comicProcessedEvent;
        this.comicsUnstableEvent = new Event(this);
        this.comicsStableEvent = new Event(this);

        this.init();
    }

    get comicDict() {
        return this._comicDict;
    }

    get comicsByPublisher() {
        return this._comicsByPublisher;
    }

    init() {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers() {
        this.storageReadyHandler = this.storageReady.bind(this);
        this.storageResponseHandler = this.storageResponse.bind(this);
        this.loadResponseHandler = this.loadResponse.bind(this);
        this.deleteResponseHandler = this.deleteResponse.bind(this);
        this.needsStorageHandler = this.sendStorageRequest.bind(this);
    }

    enable() {
        ipcRenderer.on ('storageReady', this.storageReadyHandler);
        ipcRenderer.on ('storageResponse', this.storageResponseHandler);
        ipcRenderer.on ('loadResponse', this.loadResponseHandler);
        ipcRenderer.on ('deleteResponse', this.deleteResponseHandler);

        let dateValue = new Date(userPrefs['latestReleaseDate']);

        if (dateValue !== -8640000000000000 && Utilities.exists(dateValue)) {
            this.latestDate = new Date(dateValue);
            this.latestDateUpdatedEvent.notify();
            this.loadLatestComics();
        }
    }

    storageReady() {
        this._storageReady = true;

        if (this._loadQueued) {
            this.loadLatestComics();
        }
    }

    sendStorageRequest(comic) {
        this.comicsUnstableEvent.notify();
        storageWindow.webContents.send('storageRequest', comic);
        this._storageQueue.push(comic);
    }

    // noinspection JSMethodCanBeStatic
    sendLoadRequest(date) {
        console.log('Sending load request for comics from:', date);
        storageWindow.webContents.send('loadRequest', date);
    }

    // noinspection JSMethodCanBeStatic
    sendDeleteRequest(date) {
        console.log('Sending delete request for comics not from:', date);
        storageWindow.webContents.send('deleteRequest', date);
    }

    loadLatestComics() {
        if (!this._storageReady) this._loadQueued = true;
        else {
            this.sendLoadRequest(this.latestDate.valueOf());
        }
    }

    populateComics () {
        let cboCopy = Object.assign({}, this._comicsByOriginal);
        this._comicService.getNewComicList(cboCopy).done(this.comicsProcessed.bind(this));
    }

    comicsProcessed (args) {
        let [ comicDict, publishers ] = args;

        this._comicDict = Object.assign({}, comicDict);
        this._comicsByPublisher = {};

        this.createSortedLists(publishers);

        if (this.latestDate !== this._comicService.retrievalDate) {
            this.sendDeleteRequest(this._comicService.retrievalDate);
        }
        this.latestDate = this._comicService.retrievalDate;
        this.storeLatestDate();
        this.latestDateUpdatedEvent.notify();
        this.retrievedComicsEvent.notify();

        if (storageWindow) this.storeCollection();
    }

    storeCollection () {
        let count = 0;

        for(let key in this._comicDict) {
            if (!this._comicDict.hasOwnProperty(key)) continue;

            let comic = this._comicDict[key];

            this.sendStorageRequest(comic);

            count++;
        }
    }

    storageResponse (event, message) {
        let comicRemote = message;
        let comicLocal = this._comicsByOriginal[comicRemote.originalString];
        comicLocal.id = comicRemote.id;

        comicLocal.variantList.forEach(function(variant) {
                this._comicsByOriginal[variant.originalString] = variant;
                variant.mainID = comicLocal.id;
                // noinspection JSPotentiallyInvalidUsageOfClassThis
                this.sendStorageRequest(variant);
            }.bind(this));

        let index = this._storageQueue.indexOf(comicLocal);
        if (index !== -1) this._storageQueue.splice(index, 1);

        if (!this._storageQueue.length) {
            this.comicsStableEvent.notify();
        }
    }

    loadResponse (event, message) {
        let variantQueue = [];
        let publishers = [];
        let comicsById = {};
        let collection = this;

        message.forEach(function (comic) {
            let newComic = Comic.fromGeneric(comic[0]);

            if (!publishers.includes(newComic.publisher)) publishers.push(newComic.publisher);

            if (newComic.variant) {
                variantQueue.push(newComic);
            }
            else {
                comicsById[newComic.id] = newComic;
                collection.comicDict[newComic.key] = newComic;
            }
        });

        variantQueue.forEach(function (variant) {
            let mainComic = comicsById[variant.mainID];
            mainComic.addVariant(variant);
        });

        if (!message.length) {
            this.latestDate = null;
            this.storeLatestDate();
        }

        console.log('Loaded ' + message.length + ' comics');

        this.latestDateUpdatedEvent.notify();
        this.createSortedLists(publishers);
        this.retrievedComicsEvent.notify();
    }

    deleteResponse (event, message) {
        if (!message) {
            this.sendDeleteRequest(this.latestDate);
        }
    }

    createSortedLists (publishers) {
        let collection = this;
        publishers = publishers.sort();

        publishers.forEach(function(publisher){
            collection.comicsByPublisher[publisher] = [];
        });

        let sortedComics = Object.values(collection.comicDict).sort(Comic.compare);

        sortedComics.forEach(function(comic){
            this._comicsByOriginal[comic.originalString] = comic;
            let publisher = comic.publisher;
            collection.comicsByPublisher[publisher].push(comic);
            comic.needsStorageEvent.attach(this.needsStorageHandler);
        }.bind(this));
}

    storeLatestDate() {
        if (this.latestDate) {
            ipcRenderer.send('prefSet', { key: 'latestReleaseDate', value: this.latestDate.valueOf() });
        }
        else {
            ipcRenderer.send('prefDelete', 'latestReleaseDate');
        }
    }
}

exports = module.exports = ComicCollection;
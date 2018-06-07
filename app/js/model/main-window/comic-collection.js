const { remote, ipcRenderer } = require('electron');
const Event = require('../../misc/event-dispatcher');
const Comic = require('./comic');
const Utilities = require('../../misc/utilities');

const storageInterface = require('./storage-interface');
const logger = require('../../misc/logger');
const userPrefs = remote.getGlobal('userPrefs');
const sender = 'ComicCollection';

class ComicCollection {
    constructor (comicService) {
        this._comicService = comicService;
        this._comicDict = {};
        this._comicsByPublisher = {};
        this._comicsByOriginal = {};
        this.latestDate = null;

        this.latestDateUpdatedEvent = new Event(this);
        this.retrievedComicsEvent = new Event(this);
        this.comicListProcessedEvent = this._comicService.comicListProcessedEvent;
        this.comicProcessedEvent = this._comicService.comicProcessedEvent;

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
        this.storeCompleteHandler = this.storeComplete.bind(this);
        this.loadCompleteHandler = this.loadComplete.bind(this);
        this.deleteCompleteHandler = this.deleteComplete.bind(this);
    }

    enable() {
        storageInterface.storageReadyEvent.attach(this.storageReadyHandler);

        let dateValue = new Date(userPrefs['latestReleaseDate']);


        if (dateValue !== -8640000000000000 && Utilities.exists(dateValue)) {
            this.latestDate = new Date(dateValue);
            this.latestDateUpdatedEvent.notify();
        }
    }

    storageReady() {
        this.loadLatestComics();
    }

    loadLatestComics() {
        if (!storageInterface.storageReady) return;

        if (Utilities.exists(this.latestDate)) {
            storageInterface.sendLoadRequest(this.latestDate.valueOf(), this.loadCompleteHandler);
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
            storageInterface.sendDeleteRequest(this._comicService.retrievalDate, this.deleteCompleteHandler);
        }
        this.latestDate = this._comicService.retrievalDate;
        this.storeLatestDate();
        this.latestDateUpdatedEvent.notify();
        this.retrievedComicsEvent.notify();

        console.log(comicDict);

        if (storageInterface.storageReady) this.storeCollection();
    }

    storeCollection () {
        let count = 0;

        for(let key in this._comicDict) {
            if (!this._comicDict.hasOwnProperty(key)) continue;

            let comic = this._comicDict[key];

            storageInterface.sendStorageRequest(comic, this.storeCompleteHandler);

            count++;
        }
    }

    storeComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal[comicRemote.originalString];
        comicLocal.id = comicRemote.id;

        comicLocal.variantList.forEach(function (variant) {
                this._comicsByOriginal[variant.originalString] = variant;
                variant.mainID = comicLocal.id;
                storageInterface.sendStorageRequest(variant, this.storeCompleteHandler);
            }.bind(this));
    }

    loadComplete (comicList) {
        let variantQueue = [];
        let publishers = [];
        let comicsById = {};
        let collection = this;

        comicList.forEach(function (comic) {
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

        if (!comicList.length) {
            this.latestDate = null;
            this.storeLatestDate();
        }

        logger.log('Loaded ' + comicList.length + ' comics', sender);

        this.latestDateUpdatedEvent.notify();
        this.createSortedLists(publishers);
        this.retrievedComicsEvent.notify();
    }

    deleteComplete (status) {
        if (!status) storageInterface.sendDeleteRequest(this.latestDate, this.deleteCompleteHandler);
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
            comic.needsStorageEvent.attach(storageInterface.sendStorageRequest.bind(storageInterface));
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
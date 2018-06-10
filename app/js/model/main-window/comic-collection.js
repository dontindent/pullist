const { remote } = require('electron');
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
        this._comicsByOriginal = {};

        this._latestDate = null;
        this._currentDate = null;
        this.availableDates = [];
        this.comicDict = {};
        this.comicsByPublisher = {};
        this.comicsToStore = 0;
        this.comicsStored = 0;

        this.currentDateUpdatedEvent = new Event(this, true);
        this.latestDateUpdatedEvent = new Event(this, true);
        this.retrievedComicsEvent = new Event(this, true);
        this.comicsStoredEvent = new Event (this, true);
        this.comicStoredEvent = new Event (this, true);
        this.comicListProcessedEvent = this._comicService.comicListProcessedEvent;
        this.comicProcessedEvent = this._comicService.comicProcessedEvent;

        this.init();
    }

    init() {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers() {
        this.storageReadyHandler = this.storageReady.bind(this);
        this.storeIndividualCompleteHandler = this.storeIndividualComplete.bind(this);
        this.storeCompleteHandler = this.storeComplete.bind(this);
        this.loadCompleteHandler = this.loadComplete.bind(this);
        this.deleteCompleteHandler = this.deleteComplete.bind(this);
        this.datesCompleteHandler = this.datesComplete.bind(this);
    }

    enable() {
        storageInterface.storageReadyEvent.attach(this.storageReadyHandler);
    }

    get latestDate () {
        return this._latestDate;
    }

    set latestDate (value) {
        if (typeof value === typeof -8640000000000000) {
            this._latestDate = new Date(value);
        }
        else {
            this._latestDate = value;
        }

        this.latestDateUpdatedEvent.notify(this._latestDate);
    }

    get currentDate () {
        return this._currentDate;
    }

    set currentDate (value) {
        if (typeof value === typeof -8640000000000000) {
            this._currentDate = new Date(value);
        }
        else {
            this._currentDate = value;
        }

        this.currentDateUpdatedEvent.notify(this._currentDate);
    }

    storageReady() {
        storageInterface.sendDatesRequest(this.datesCompleteHandler);
    }

    loadComicsForDate (date) {
        if (!storageInterface.storageReady) return;

        if (Utilities.exists(date)) {
            storageInterface.sendLoadRequest(date.valueOf(), this.loadCompleteHandler);
            this.currentDate = date;
        }
        else {
            this.retrievedComicsEvent.notify();
        }
    }

    populateComics () {
        let cboCopy = Object.assign({}, this._comicsByOriginal);
        this._comicService.getNewComicList(cboCopy).done(this.comicsProcessed.bind(this));
    }

    comicsProcessed (args) {
        let [ comicDict, publishers ] = args;

        this.comicDict = Object.assign({}, comicDict);
        this.comicsByPublisher = {};

        this.createSortedLists(publishers);

        if (this.latestDate !== this._comicService.retrievalDate) {
            storageInterface.sendDeleteRequest(this._comicService.retrievalDate, this.deleteCompleteHandler);
        }

        this.latestDate = this._comicService.retrievalDate;
        this.currentDate = this.latestDate;
        this.latestDateUpdatedEvent.notify();
        this.retrievedComicsEvent.notify();

        if (storageInterface.storageReady) this.storeCollection();
    }

    storeComic (comic) {
        storageInterface.sendStorageRequest(comic, this.storeIndividualCompleteHandler);

        this.comicsToStore++;
    }

    storeIndividualComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal[comicRemote.originalString];
        comicLocal.id = comicRemote.id;

        this.comicsStored++;
        this.comicStoredEvent.notify(comicLocal);

        if (this.comicsStored === this.comicsToStore) {
            this.comicsStoredEvent.notify();
            this.comicsToStore = 0;
            this.comicsStored = 0;
        }
    }

    storeCollection () {
        this.comicsToStore = 0;
        this.comicsStored = 0;

        for(let key in this.comicDict) {
            if (!this.comicDict.hasOwnProperty(key)) continue;

            let comic = this.comicDict[key];

            storageInterface.sendStorageRequest(comic, this.storeCompleteHandler);

            this.comicsToStore++;
        }
    }

    storeComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal[comicRemote.originalString];
        comicLocal.id = comicRemote.id;

        comicLocal.variantList.forEach(function (variant) {
                this._comicsByOriginal[variant.originalString] = variant;
                variant.mainID = comicLocal.id;
                storageInterface.sendStorageRequest(variant, this.storeCompleteHandler);
                this.comicsToStore++;
            }.bind(this));

        this.comicsStored++;
        this.comicStoredEvent.notify(comicLocal);

        if (this.comicsStored === this.comicsToStore) {
            this.comicsStoredEvent.notify();
            this.comicsToStore = 0;
            this.comicsStored = 0;
        }
    }

    datesComplete (datesList) {
        this.availableDates = datesList;
        this.latestDate = Math.max(...this.availableDates);

        this.loadComicsForDate(this.latestDate);
    }

    loadComplete (comicList) {
        let variantQueue = [];
        let publishers = [];
        let comicsById = {};
        let collection = this;

        comicList.forEach(function (comic) {
            let newComic = Comic.fromGeneric(comic);

            if (!publishers.includes(newComic.publisher)) publishers.push(newComic.publisher);

            collection._comicsByOriginal[newComic.originalString] = newComic;

            if (newComic.coverURL === null) {
                collection._comicService.reScrapeComic(newComic).done(function () {
                    collection.storeComic(newComic);
                });
            }

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
            this.currentDate = null;
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
}

exports = module.exports = ComicCollection;
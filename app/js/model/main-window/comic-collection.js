const Event = require('../../misc/event-dispatcher');
const Comic = require('./comic');
const Utilities = require('../../misc/utilities');
const logger = require('../../misc/logger');
const sender = 'ComicCollection';

let tempDate = null;

class ComicCollection {
    constructor(comicService, storageInterface) {
        this._comicService = comicService;
        this._storageInterface = storageInterface;
        this._comicsByOriginal = new Map();
        this._comicsLastPulledQueue = [];
        
        this._currentDate = null;
        this._earliestDate = null;
        this._latestDate = null;
        this.availableDates = [];
        this.comicDict = new Map();
        this.comicsByPublisher = new Map();
        this.comicsStored = 0;
        this.comicsToStore = 0;

        this.comicListProcessedEvent = this._comicService.comicListProcessedEvent;
        this.comicProcessedEvent = this._comicService.comicProcessedEvent;
        this.comicStoredEvent = new Event(this, true);
        this.comicsStoredEvent = new Event(this, true);
        this.currentDateUpdatedEvent = new Event(this, true);
        this.lastIssueUpdatedEvent = new Event(this, false);
        this.latestDateUpdatedEvent = new Event(this, true);
        this.retrievedComicsEvent = new Event(this, true);

        this.init();
    }

    //#region Setup

    init() {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers() {
        this._datesCompleteHandler = this._onDatesComplete.bind(this);
        this._deleteCompleteHandler = this._onDeleteComplete.bind(this);
        this._latestComicsRetrievedHandler = this._onLatestComicsRetrieved.bind(this);
        this._loadCompleteHandler = this._onLoadComplete.bind(this);
        this._mainUpdatedHandler = this._onMainUpdated.bind(this);
        this._storageReadyHandler = this._onStorageReady.bind(this);
        this._storeCompleteHandler = this._onStoreComplete.bind(this);
        this._storeIndividualCompleteHandler = this._onStoreIndividualComplete.bind(this);
    }

    enable() {
        this._storageInterface.storageReadyEvent.attach(this._storageReadyHandler);
    }

    //#endregion

    //#region Properties

    get currentDate() {
        return this._currentDate;
    }

    set currentDate(value) {
        this._currentDate = dateCheck(value);
        this.currentDateUpdatedEvent.notify(this._currentDate);
    }

    get earliestDate() {
        return this._earliestDate;
    }

    set earliestDate(value) {
        this._earliestDate = dateCheck(value);
    }

    get latestDate() {
        return this._latestDate;
    }

    set latestDate(value) {
        this._latestDate = dateCheck(value);
        this.latestDateUpdatedEvent.notify(this._latestDate);
    }

    //#endregion

    //#region Handlers

    _onDatesComplete(datesList) {
        this.availableDates = datesList;
        this.earliestDate = Math.min(...this.availableDates);
        this.latestDate = Math.max(...this.availableDates);

        this.loadComicsForDate(this.latestDate);
    }

    _onDeleteComplete(status) {
        if (!status) this._storageInterface.sendDeleteRequest(this.latestDate,
            this._deleteCompleteHandler);
    }

    /** Called after a new comics list has been retreived by the comic service. */
    _onLatestComicsRetrieved (args) {
        let [ comicDict, publishers ] = args;

        this.comicDict = new Map(comicDict);
        this.comicsByPublisher.clear();

        for (let comic in this.comicDict.values()) {
            comic.mainUpdatedEvent.attach(this._mainUpdatedHandler);
        }

        this.createSortedLists(publishers);

        if (this.latestDate !== this._comicService.retrievalDate) {
            this._storageInterface.sendDeleteRequest(this._comicService.retrievalDate,
                this._deleteCompleteHandler);
        }

        this.latestDate = this._comicService.retrievalDate;
        this.currentDate = this.latestDate;
        if (!this.earliestDate) this.earliestDate = this.latestDate;

        this.retrievedComicsEvent.notify();

        if (this._storageInterface.storageReady) this.storeCollection();
    }

    _onLoadComplete (comicList) {
        let variantQueue = [];
        let publishers = [];
        let comicsById = new Map();
        let collection = this;

        this._comicsByOriginal.clear();
        this.comicDict.clear();

        for (let comic of comicList) {
            let newComic = Comic.fromGeneric(comic, collection._storageInterface);

            if (!publishers.includes(newComic.publisher)) publishers.push(newComic.publisher);

            collection._comicsByOriginal.set(newComic.originalString, newComic);

            if (newComic.coverURL === null) {
                collection._comicService.reScrapeComic(newComic).done(function () {
                    collection.storeComic(newComic);
                });
            }

            if (newComic.variant) {
                variantQueue.push(newComic);
            } 
            else {
                comicsById.set(newComic.id, newComic);
                collection.comicDict.set(newComic.key, newComic);
                newComic.mainUpdatedEvent.attach(this._mainUpdatedHandler);
            }
        }

        for (let variant of variantQueue) {
            let mainComic = comicsById.get(variant.mainID);

            if (mainComic) {
                variant.pulled = false;
                mainComic.addVariant(variant);
            }
            else {
                variant.mainComic = null;
                variant.mainID = 0;
                variant.variant = false;
                comicsById.set(variant.id, variant);
                collection.comicDict.set(variant.key, variant);
                variant.mainUpdatedEvent.attach(this._mainUpdatedHandler);
            }
        }

        if (!comicList.length) {
            this.currentDate = null;
        } 
        else {
            this.currentDate = tempDate;
            tempDate = null;
        }

        logger.log('Loaded ' + collection.comicDict.size + ' comics', sender);

        this.createSortedLists(publishers);
        logger.log(this.comicsByPublisher.length);
        this.retrievedComicsEvent.notify();
    }

    _onMainUpdated (sender) {
        let oldMain = sender;
        let oldMainPubList = this.comicsByPublisher.get(oldMain.publisher);

        this.comicDict.set(oldMain.key, oldMain.mainComic);
        oldMainPubList[oldMainPubList.indexOf(oldMain)] = oldMain.mainComic;
    }

    _onStorageReady() {
        this._storageInterface.sendDatesRequest(this._datesCompleteHandler);
    }

    _onStoreComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal.get(comicRemote.originalString);
        comicLocal.id = comicRemote.id;

        for (let variant of comicLocal.variantList) {
            this._comicsByOriginal.set(variant.originalString, variant);
            variant.mainID = comicLocal.id;
            this._storageInterface.sendStorageRequest(variant, this._storeCompleteHandler);
            this.comicsToStore++;
        }

        this.comicsStored++;
        this.comicStoredEvent.notify(comicLocal);

        if (this.comicsStored === this.comicsToStore) {
            this.comicsStoredEvent.notify();
            this.comicsToStore = 0;
            this.comicsStored = 0;
        }
    }

    _onStoreIndividualComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal.get(comicRemote.originalString);
        comicLocal.id = comicRemote.id;

        this.comicsStored++;
        this.comicStoredEvent.notify(comicLocal);

        if (this.comicsStored === this.comicsToStore) {
            this.comicsStoredEvent.notify();
            this.comicsToStore = 0;
            this.comicsStored = 0;
        }
    }

    //#endregion

    loadComicsForDate(date) {
        if (!this._storageInterface.storageReady) return;

        if (!Utilities.exists(date) || !(date instanceof Date)) {
            throw 'Date object required.';
        }

        this.retrievedComicsEvent.clear();

        this._storageInterface.sendLoadRequest(date.valueOf(), 
                                               this._loadCompleteHandler);
        tempDate = date;
    }

    retrieveLatestComics() {
        let cboCopy = new Map(this._comicsByOriginal);
        this.retrievedComicsEvent.clear();
        this._comicService.getNewComicList(cboCopy).done(
            this._latestComicsRetrievedHandler
        );
    }
    
    storeCollection () {
        this.comicsToStore = 0;
        this.comicsStored = 0;
        
        for (let comic of this.comicDict.values()) {
            this._storageInterface.sendStorageRequest(comic, this._storeCompleteHandler);
            
            this.comicsToStore++;
        }
    }

    storeComic (comic) {
        this._storageInterface.sendStorageRequest(comic, this._storeIndividualCompleteHandler);

        this.comicsToStore++;
    }
    
    loadLastPulledIssue (comic) {
        this._comicsLastPulledQueue.push(comic);
        this._storageInterface.sendLoadLastPulledRequest(comic.series,
            comic.number, this.onLastPulledIssueLoaded.bind(this));
    }

    onLastPulledIssueLoaded (comicObject) {
        let comicSource = this._comicsLastPulledQueue.shift();

        comicSource.lastPulledNumber = comicObject.Number;
        comicSource.lastPulledDate = new Date(comicObject.ReleaseDate);

        this.lastIssueUpdatedEvent.notify(comicSource);
    }

    createSortedLists (publishers) {
        let collection = this;
        publishers = publishers.sort();

        collection.comicsByPublisher.clear();

        for (let publisher of publishers) {
            collection.comicsByPublisher.set(publisher, []);
        }

        let sortedComics = Array.from(collection.comicDict.values()).sort(Comic.compare);

        for (let comic of sortedComics) {
            this._comicsByOriginal.set(comic.originalString, comic);
            let publisher = comic.publisher;
            collection.comicsByPublisher.get(publisher).push(comic);
            comic.needsStorageEvent.attach(this._storageInterface.sendStorageRequest
                .bind(this._storageInterface));

            for (let variant of comic.variantList) {
                variant.needsStorageEvent.attach(this._storageInterface.sendStorageRequest
                    .bind(this._storageInterface));
            }
        }
    }
}

function dateCheck(value) {
    if (typeof value === typeof - 8640000000000000) {
        return new Date(value);
    } else if (value instanceof Date) {
        return value;
    } else {
        throw value + ' is not convertible to Date.';
    }
}

exports = module.exports = ComicCollection;
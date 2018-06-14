const { remote } = require('electron');
const Event = require('../../misc/event-dispatcher');
const Comic = require('./comic');
const Utilities = require('../../misc/utilities');
const logger = require('../../misc/logger');
// eslint-disable-next-line no-unused-vars
const userPrefs = remote.getGlobal('userPrefs');
const sender = 'ComicCollection';

let tempDate = null;

class ComicCollection {
    constructor (comicService, storageInterface) {
        this._comicService = comicService;
        this._storageInterface = storageInterface;
        this._comicsByOriginal = {};
        this._comicsLastPulledQueue = [];

        this._earliestDate = null;
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
        this.lastIssueUpdatedEvent = new Event(this, false);
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
        this._storageInterface.storageReadyEvent.attach(this.storageReadyHandler);
    }

    get earliestDate () {
        return this._earliestDate;
    }

    set earliestDate (value) {
        this._earliestDate = dateCheck(value);
    }

    get latestDate () {
        return this._latestDate;
    }

    set latestDate (value) {
        this._latestDate = dateCheck(value);
        this.latestDateUpdatedEvent.notify(this._latestDate);
    }

    get currentDate () {
        return this._currentDate;
    }

    set currentDate (value) {
        this._currentDate = dateCheck(value);
        this.currentDateUpdatedEvent.notify(this._currentDate);
    }

    storageReady() {
        this._storageInterface.sendDatesRequest(this.datesCompleteHandler);
    }

    loadComicsForDate (date) {
        if (!this._storageInterface.storageReady) return;

        if (!Utilities.exists(date) || !(date instanceof Date)) {
            throw 'Date object required.';
        }

        this.retrievedComicsEvent.clear();

        this._storageInterface.sendLoadRequest(date.valueOf(), this.loadCompleteHandler);
        tempDate = date;
    }

    populateComics () {
        let cboCopy = Object.assign({}, this._comicsByOriginal);
        this.retrievedComicsEvent.clear();
        this._comicService.getNewComicList(cboCopy).done(this.comicsProcessed.bind(this));
    }

    /** Called after a new comics list has been retreived by the comic service. */
    comicsProcessed (args) {
        let [ comicDict, publishers ] = args;

        this.comicDict = Object.assign({}, comicDict);
        this.comicsByPublisher = {};

        this.createSortedLists(publishers);

        if (this.latestDate !== this._comicService.retrievalDate) {
            this._storageInterface.sendDeleteRequest(this._comicService.retrievalDate, this.deleteCompleteHandler);
        }

        this.latestDate = this._comicService.retrievalDate;
        this.currentDate = this.latestDate;
        if (!this.earliestDate) this.earliestDate = this.latestDate;

        this.retrievedComicsEvent.notify();

        if (this._storageInterface.storageReady) this.storeCollection();
    }

    storeComic (comic) {
        this._storageInterface.sendStorageRequest(comic, this.storeIndividualCompleteHandler);

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

            this._storageInterface.sendStorageRequest(comic, this.storeCompleteHandler);

            this.comicsToStore++;
        }
    }

    storeComplete (comicRemote) {
        let comicLocal = this._comicsByOriginal[comicRemote.originalString];
        comicLocal.id = comicRemote.id;

        comicLocal.variantList.forEach(function (variant) {
                this._comicsByOriginal[variant.originalString] = variant;
                variant.mainID = comicLocal.id;
                this._storageInterface.sendStorageRequest(variant, this.storeCompleteHandler);
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
        this.earliestDate = Math.min(...this.availableDates);
        this.latestDate = Math.max(...this.availableDates);

        this.loadComicsForDate(this.latestDate);
    }

    loadComplete (comicList) {
        let variantQueue = [];
        let publishers = [];
        let comicsById = {};
        let collection = this;

        this._comicsByOriginal = {};
        this.comicDict = {};

        comicList.forEach(function (comic) {
            let newComic = Comic.fromGeneric(comic, collection._storageInterface);

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
        else {
            this.currentDate = tempDate;
            tempDate = null;
        }

        logger.log('Loaded ' + comicList.length + ' comics', sender);

        this.createSortedLists(publishers);
        this.retrievedComicsEvent.notify();
    }

    deleteComplete (status) {
        if (!status) this._storageInterface.sendDeleteRequest(this.latestDate, this.deleteCompleteHandler);
    }

    loadLastPulledIssue (comic) {
        this._comicsLastPulledQueue.push(comic);
        this._storageInterface.sendLoadLastPulledRequest(comic.series, comic.number, this.onLastPulledIssueLoaded.bind(this));
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

        collection.comicsByPublisher = {};

        publishers.forEach(function(publisher){
            collection.comicsByPublisher[publisher] = [];
        });

        let sortedComics = Object.values(collection.comicDict).sort(Comic.compare);

        sortedComics.forEach(function(comic){
            this._comicsByOriginal[comic.originalString] = comic;
            let publisher = comic.publisher;
            collection.comicsByPublisher[publisher].push(comic);
            comic.needsStorageEvent.attach(this._storageInterface.sendStorageRequest.bind(this._storageInterface));
        }.bind(this));
    }
}

function dateCheck (value) {
    if (typeof value === typeof -8640000000000000) {
        return new Date(value);
    }
    else if (value instanceof Date) {
        return value;
    }
    else {
        throw value + ' is not convertible to Date.';
    }
}

exports = module.exports = ComicCollection;
const Utilities = require('../../misc/utilities');
const Event = require('../../misc/event-dispatcher');


class Comic {
    constructor () {
        this.id = 0;
        this.series = "";
        this.number = -1.0;
        this.writer = "";
        this.artist = "";
        this.coverArtist = "";
        this.publisher = "";
        // noinspection JSUnusedGlobalSymbols
        this.description = "";
        this.price = 0.0;
        this._pulled = false;
        this._watched = false;
        this.code = "";
        this.coverURL = "";
        this.reprint = false;
        this.variant = false;
        this.releaseDate = new Date(-8640000000000000);
        this.originalString = "";

        this.mainID = 0;
        this.variantList = [];
        // noinspection JSUnusedGlobalSymbols
        this.mainComic = null;

        this.lastPulledNumber = -1;
        this.lastPulledDate = new Date(-8640000000000000);

        this.needsStorageEvent = new Event(this);
        this.pullStatusChangedEvent = new Event(this);
        this.watchStatusChangedEvent = new Event(this);
        this.lastIssueUpdatedEvent = new Event(this);
        this.mainUpdatedEvent = new Event(this);
    }

    // #region Properties

    get key () {
        if (this.number === -1.0) return this.series;
        else return this.series + ' ' + this.number;
    }

    get title () {
        if (this.number === -1.0) return this.series;
        return this.series + ' #' + this.number;
    }

    get lastPulled () {
        if (this.lastPulledNumber && this.lastPulledNumber !== -1) {
            return 'Issue ' + this.lastPulledNumber + ' pulled on ' + this.lastPulledDate.toLocaleDateString("en-US");
        }

        return '';
    }

    get pulled () {
        return this._pulled;
    }

    set pulled (value) {
        if (this._pulled === value) return; 

        this._pulled = value;
        this.pullStatusChangedEvent.notify(this._pulled);
        this.needsStorageEvent.notify();
    }

    get watched () {
        return this._watched;
    }

    set watched (value) {
        if (this._watched === value) return;

        this._watched = value;
        this.watchStatusChangedEvent.notify(this._watched);
        this.needsStorageEvent.notify();
    }

    // #endregion

    addVariant (comic) {
        let thisComic = this;

        if (thisComic.equals(comic)) return false;

        let variantResult = this.hasVariant(comic);

        if (!variantResult) {
            comic.variantList.forEach(function (variant) {
                thisComic.addVariant(variant);
            });
            thisComic.variantList.push(comic);
            comic.variantList.length = 0;
            comic.variant = true;
            comic.mainComic = thisComic;
            comic.mainID = thisComic.id;

            return true;
        } else {
            return false;
        }
    }

    static assembleVariants (comicsList) {
        comicsList = Utilities.removeDuplicates(comicsList, 'originalString');

        comicsList.sort((a, b) => {
            return a.price - b.price;
        });

        let newMain = comicsList.shift();
        newMain.mainComic = null;
        newMain.mainID = 0;

        comicsList.forEach((variant) => {
            newMain.addVariant(variant);
        });

        return newMain;
    }

    static compare (a, b) {
        let aName = (a.key).toLowerCase();
        let bName = (b.key).toLowerCase();

        if (aName < bName) return -1;
        if (aName > bName) return 1;

        return 0;
    }

    static compareByPrice (a, b) {
        let aOriginal = (a.originalString).toLowerCase();
        let bOriginal = (b.originalString).toLowerCase();

        let difference = a.price - b.price;

        if (difference === 0) {
            if (aOriginal < bOriginal) return -1;
            if (aOriginal > bOriginal) return 1;
            return 0;
        }

        return difference;
    }

    copyDetails (comic) {
        this.series = comic.series;
        this.number = comic.number;
        this.writer = comic.writer;
        this.artist = comic.artist;
        this.coverArtist = comic.coverArtist;
        this.publisher = comic.publisher;
        // noinspection JSUnusedGlobalSymbols
        this.description = comic.description;
        this.price = comic.price;
        this.pulled = comic.pulled;
        this.watched = comic.watched;
        this.code = comic.code;
        this.coverURL = comic.coverURL;
        this.reprint = comic.reprint;
        this.variant = comic.variant;
        this.releaseDate = comic.releaseDate;
        this.originalString = comic.originalString;
    }

    equals (comic) {
        return this.originalString === comic.originalString && this.releaseDate === comic.releaseDate;
    }

    static fromGeneric (object) {
        let result = new Comic();

        result.id = object.Id;
        result.series = object.Series;
        result.number = object.Number;
        result.writer = object.Writer;
        result.artist = object.Artist;
        result.coverArtist = object.CoverArtist;
        result.publisher = object.Publisher;
        result.description = object.Description;
        result.price = object.Price;
        result.pulled = !!object.Pulled;
        result.watched = !!object.Watched;
        result.code = object.Code;
        result.coverURL = object.CoverURL;
        result.reprint = !!object.Reprint;
        result.variant = !!object.Variant;
        result.releaseDate = new Date(object.ReleaseDate);
        result.originalString = object.OriginalString;

        result.mainID = object.MainId;

        return result;
    }

    hasVariant (comic) {
        this.variantList.forEach(function (variant) {
            if (variant.equals(comic)) return variant;
        });
    }

    makeMain () {
        if (!this.mainComic) return;

        let oldMain = this.mainComic;
        let variantList = this.mainComic.variantList.slice(0);
        variantList.unshift(this.mainComic);
        variantList.splice(variantList.indexOf(this), 1);
        variantList = variantList.sort(Comic.compareByPrice);

        for (let variant of variantList) {
            variant.mainComic = this;
            variant.mainID = this.id;
            variant.variant = true;
            variant.variantList = [];
            variant.needsStorageEvent.notify();
        }

        this.mainComic = null;
        this.mainID = 0;
        this.variant = false;
        this.variantList = variantList;

        this.needsStorageEvent.notify();
        oldMain.mainUpdatedEvent.notify();
    }
}

exports = module.exports = Comic;
const Utilities = require('../misc/utilities');

class Comic {
    constructor() {
        this.id = 0;
        this.series = "";
        this.number = -1.0;
        this.writer = "";
        this.artist = "";
        this.coverArtist = "";
        this.publisher = "";
        this.description = "";
        this.price = 0.0;
        this.pulled = false;
        this.watched = false;
        this.code = "";
        this.coverURL = "";
        this.reprint = false;
        this.variant = false;
        this.releaseDate = new Date(-8640000000000000);
        this.originalString = "";

        this.mainID = 0;
        this.variantList = [];
        this.mainComic = null;
    }

    get key() {
        if (this.number === -1.0) return this.series;
        else return this.series + ' ' + this.number;
    }

    get title() {
        if (this.number === -1.0) return this.series;
        return this.series + ' #' + this.number;
    }

    equals(comic) {
        return this.originalString === comic.originalString;
    }

    hasVariant(comic) {
        this.variantList.forEach(function (variant) {
            if (variant.equals(comic)) return variant;
        });
    }

    copyDetails(comic) {
        this.series = comic.series;
        this.number = comic.number;
        this.writer = comic.writer;
        this.artist = comic.artist;
        this.coverArtist = comic.coverArtist;
        this.publisher = comic.publisher;
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

    addVariant(comic) {
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

    static assembleVariants(comicsList) {
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

    static fromGeneric(object) {
        let result = new Comic();

        result.id = object['Id'];
        result.series = object['Series'];
        result.number = object['Number'];
        result.writer = object['Writer'];
        result.artist = object['Artist'];
        result.coverArtist = object['CoverArtist'];
        result.publisher = object['Publisher'];
        result.description = object['Description'];
        result.price = object['Price'];
        result.pulled = !!object['Pulled'];
        result.watched = !!object['Watched'];
        result.code = object['Code'];
        result.coverURL = object['CoverURL'];
        result.reprint = !!object['Reprint'];
        result.variant = !!object['Variant'];
        result.releaseDate = new Date(object['ReleaseDate']);
        result.originalString = object['OriginalString'];

        result.mainID = object['MainId'];

        return result;
    }

    static compare(a, b) {
        let aName = (a.key).toLowerCase();
        let bName = (b.key).toLowerCase();

        if (aName < bName) return -1;
        if (aName > bName) return 1;

        return 0;
    }
}

exports = module.exports = Comic;
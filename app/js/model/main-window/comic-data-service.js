const Event = require('../../misc/event-dispatcher');
const Comic = require('./comic');
const Utilities = require('../../misc/utilities');
const logger = require("../../misc/logger");

const newReleasesUrl = 'https://www.previewsworld.com/shipping/newreleases.txt';
const detailUrlBase = 'http://www.previewsworld.com/Catalog/';
const previewsWorldBase = "http://www.previewsworld.com";

// noinspection JSUnresolvedVariable
global.detailUrlBase = detailUrlBase;

class ComicDataService {
    constructor (storageService, userPrefs) {
        this._storageService = storageService; 
        this._userPrefs = userPrefs
        this.callerString = 'ComicDataService';
        this.comicCount = 0;
        this.comicsByOriginal = new Map();
        this.comicDict = new Map();
        this.comicListProcessedEvent = new Event(this);
        this.comicProcessedEvent = new Event(this);
        this.processedComics = 0;
        this.publishers = [];
        this.retrievalDate = new Date(-8640000000000000);
    }

    getNewComicList (comicsByOriginalString) {
        let service = this;
        let deferred = $.Deferred();
        this.comicCount = 0;
        this.processedComics = 0;
        this.comicDict.clear();

        let includeOnlyComics = this._userPrefs.includeOnlyComics;

        if (Utilities.exists(comicsByOriginalString)) { // noinspection JSUnusedGlobalSymbols
            this.comicsByOriginal = comicsByOriginalString;
        }

        if (includeOnlyComics === null || includeOnlyComics === undefined) {
            includeOnlyComics = true;
        }

        $.get(newReleasesUrl, function (contents) {
            processList(service, contents);
            processDetails(service).done(function () {
                if (includeOnlyComics) {
                    removeNonComics(service);
                }
                logger.log('Parsed ' + service.comicCount + ' comics', service.callerString);

                deferred.resolve([service.comicDict, service.publishers]);
            });
        });

        return deferred.promise();
    }

    reScrapeComic (comic) {
        return getComicDetails(this, comic, false);
    }
}

function processList(comicService, rawList) {
    let dateFound = false;
    let lines = rawList.match(/^.*((\r\n|\n|\r)|$)/gm);
    let date;
    let publisher = '';
    let count = 0;
    let variantPool = new Map();
    let variantKeys = [];

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (!dateFound) {
            const dateRegex = /New Releases for ([\d/]+)/gmi;
            let dateMatch = dateRegex.exec(line);

            if(dateMatch) {
                date = new Date(dateMatch[1]);
                dateFound = true;

                // We need to clear all the comics not related to the current release date
                if (comicService.retrievalDate !== date) {
                    comicService.comicsByOriginal.clear();
                    comicService.comicDict.clear();
                    comicService.publishers = [];
                }

                continue;
            }
        }

        let parameters = line.replace(/[\r\n]/g, '').split(/\t/);

        if (parameters.length !== 3) {
            if (line.length < 3) continue;

            if(line.includes('DARK HORSE')) publisher = 'Dark Horse Comics';
            else if(line.includes('DC COMICS')) publisher = 'DC Comics';
            else if(line.includes('IDW')) publisher = 'IDW Publishing';
            else if(line.includes('IMAGE')) publisher = 'Image Comics';
            else if(line.includes('MARVEL')) publisher = 'Marvel Comics';
            else if(line.includes('GRAPHIC')) publisher = 'Comics & Graphic Novels';

            continue;
        }

        let cost = parseFloat(parameters[2].replace(/[^0-9-.]/g, ''));

        // Group 1 - Title
        // Group 2 - Number
        // Group 3 - Reprint
        // Group 4 - Reprint count
        let newTitleRegex = /(.+) #([\d.]+)(?!.+POSTER)[^\d]*((\d+).+ptg)?/gmi;
        let match = newTitleRegex.exec(parameters[1]);
        let title = '';
        let number = -1.0;
        let key = '';
        let reprint = false;

        if (match == null && cost <= 7.0) {
            title = parameters[1];
            key = title;
        }
        else if(match != null) {
            title = match[1];
            number = parseFloat(match[2]);
            key = title + ' ' + number;
            reprint = match[3] !== undefined;
        }
        else continue;

        let comic = new Comic();
        comic.series = title;
        comic.number = number;
        comic.code = parameters[0];
        comic.price = cost;
        comic.reprint = reprint;
        comic.publisher = publisher;
        comic.releaseDate = date;
        comic.originalString = parameters[1];
        comic.variantList = [];

        if (comicService.comicsByOriginal.has(comic.originalString)) {
            let original = comicService.comicsByOriginal.get(comic.originalString);
            original.copyDetails(comic);
            original.variantList.length = 0;
            original.variant = false;
            original.mainComic = null;
            original.mainID = 0;
            comic = original;
        }
        else {
            comicService.comicsByOriginal.set(comic.originalString, comic);
        }

        count++;

        if (!comicService.comicDict.has(key)) {
            comicService.comicDict.set(key, comic);
        }
        else {
            if (!variantPool.has(key)) {
                variantPool.set(key, [ comic ]);
                variantKeys.push(key);
            }
            else variantPool.get(key).push(comic);
        }
    }

    for (let variantKey of variantKeys) {
        variantPool.get(variantKey).push(comicService.comicDict.get(variantKey));

        let variants = variantPool.get(variantKey).sort(Comic.compareByPrice);

        let main = variants[0];
        main.mainComic = null;
        main.mainID = 0;
        main.variant = false;
        
        for (let i = 1; i < variants.length; i++) {
            main.addVariant(variants[i]);
        }

        comicService.comicDict.set(variantKey, main);
    }

    comicService.retrievalDate = date;
    comicService.comicListProcessedEvent.notify(count);
    logger.log(['Found', count, 'comics in text list'], comicService.callerString);

    return count;
}

function processDetails(comicService) {
    let i = 0;
    let promises = [];

    for (let comic of comicService.comicsByOriginal.values()) {
        promises.push(getComicDetails(comicService, comic));

        i++;
    }

    logger.log(['Getting details of', i, 'comics'], comicService.callerString);

    return $.when.apply(undefined, promises).promise();
}

function getComicDetails(comicService, comic, updateService = true) {
    // Group 2 - Writer
    // Group 4 - Artist
    // Group 6 - Cover artist
    let creativeTeamRegex = /(\(W.*?\) ([^(]+))*(\(A.*?\) ([^(]+))*(\(CA.*?\) ([^(]+))*/gmi;
    let detailUrl = detailUrlBase + comic.code;

    let deferred = $.Deferred();

    $.get(detailUrl, function(contents) {
        let $previewsDOM = $($.parseHTML(contents));
        let $catalogDetail = $previewsDOM.find('div.CatalogFullDetail');
        let $catalogText = $previewsDOM.find('div.CatalogFullDetail div.Text');
        let $contentImage = $previewsDOM.find('img#MainContentImage');

        let descriptionString = '';
        // Extract all the plaintext elements from the details div
        let $descriptionElements = $catalogText.contents().filter(function(){
            return this.nodeName !== 'DIV';
        });
        $descriptionElements.each(function(){
            if(this.nodeName === 'BR') {
                descriptionString += '\n';
            }
            else {
                //@ts-ignore
                descriptionString += this.textContent ? this.textContent.trim() : this.innerHTML.trim();
            }
        });
        comic.description = descriptionString.trim();

        let creativeString = $catalogText.find('.Creators')[0].textContent.replace(/ +/g, ' ').trim();
        let creativeMatch = creativeTeamRegex.exec(creativeString);
        if (creativeMatch) {
            comic.writer = creativeMatch[2] ?  creativeMatch[2].trim() : '';
            comic.artist = creativeMatch[4] ? creativeMatch[4].trim() : comic.writer;
            comic.coverArtist = creativeMatch[6] ? creativeMatch[6].trim() : comic.artist;
        }

        comic.publisher = $catalogDetail.find('.Publisher')[0].textContent.replace(/ +/g, ' ').trim();
        if (updateService) {
            if (!comicService.publishers.includes(comic.publisher)) comicService.publishers.push(comic.publisher);
        }

        comic.coverURL = previewsWorldBase + $($contentImage[0]).attr('src');

        comicService.comicProcessedEvent.notify(comic);
        if (updateService) comicService.processedComics++;

        deferred.resolve(comic);
    }).fail(function() {
        logger.log ('comicDataService failed GET for ' + comic.title, comicService.callerString);
    });

    if (updateService) comicService.comicCount++;

    return deferred.promise();
}

function removeNonComics(comicService) {
    let oldCount = comicService.comicCount;

    comicService.publishers = [];
    comicService.comicCount = 0;

    for (let comic of comicService.comicsByOriginal.values()) {
        if (!comic.writer && !comic.artist && !comic.coverArtist) {
            comicService.comicsByOriginal.delete(comic.originalString);
            comicService.comicDict.delete(comic.key);
        }
        else {
            if (!comicService.publishers.includes(comic.publisher)) comicService.publishers.push(comic.publisher);
            comicService.comicCount ++;
        }
    }

    logger.log([ 'Pruned', oldCount - comicService.comicCount, 'non-comics from the list' ], comicService.callerString);
}

//@ts-ignore
exports = module.exports = ComicDataService;
const $ = require('jquery');
const Event = require('../misc/event-dispatcher');

class ComicContainer {
    constructor() {
        this.$detailBackground = $('img#details-background-img');
        this.$detailTitle = $('div#details-content h1');
        this.$detailCover = $('img#detail-cover');
        this.$detailWriter = $('div#writer-div p.detail');
        this.$detailArtist = $('div#artist-div p.detail');
        this.$detailPublisher = $('div#publisher-div p.detail');
        this.$detailCode = $('div#distributor-code-div p.detail');
        this.$detailPrice = $('div#price-div p.detail');
        this.$detailDescription = $('div#description-div p.detail');
        this.$watchButton = $('a#watch-button');
        this.$unWatchButton = $('a#un-watch-button');
        this.$pullButton = $('a#pull-button');
        this.$unPullButton = $('a#un-pull-button');

        this.watchFunction = null;
        this.unWatchFunction = null;
        this.pullFunction = null;
        this.unPullFunction = null;
        this.detailBackgroundLoadedFunction = null;
        this.detailCoverLoadedFunction = null;
    }

    select (selectedComicElement) {
        let container = this;
        let comic = selectedComicElement.comic;

        $(selectedComicElement).addClass('selected-comic');

        this.detailBackgroundLoadedFunction = function() {
            container.$detailBackground.removeClass('details-hidden');
        };

        this.detailCoverLoadedFunction = function() {
            container.$detailCover.removeClass('details-hidden');
        };

        this.$detailBackground.on('load', this.detailBackgroundLoadedFunction);
        this.$detailCover.on('load', this.detailCoverLoadedFunction);

        this.$detailBackground.addClass('details-hidden');
        this.$detailBackground.attr('src', comic.coverURL);
        this.$detailTitle.text(comic.title);
        this.$detailCover.addClass('details-hidden');
        this.$detailCover.attr('src', comic.coverURL);
        this.$detailWriter.text(comic.writer);
        this.$detailArtist.text(comic.artist);
        this.$detailPublisher.text(comic.publisher);
        this.$detailCode.text(comic.code);
        this.$detailPrice.text('$' + comic.price.toFixed(2));
        this.$detailDescription.text(comic.description);

        this.watchFunction = function (event) {
            event.preventDefault();
            comic.watched = true;
            ReleasesView.updateHeaderButtons(comic);
        };

        this.unWatchFunction = function (event) {
            event.preventDefault();
            comic.watched = false;
            ReleasesView.updateHeaderButtons(comic);
        };

        this.pullFunction = function (event) {
            event.preventDefault();
            comic.pulled = true;
            ReleasesView.updateHeaderButtons(comic);
        };

        this.unPullFunction = function (event) {
            event.preventDefault();
            comic.pulled = false;
            ReleasesView.updateHeaderButtons(comic);
        };

        this.$watchButton.on('click', this.watchFunction);
        this.$unWatchButton.on('click', this.unWatchFunction);
        this.$pullButton.on('click', this.pullFunction);
        this.$unPullButton.on('click', this.unPullFunction);

        ReleasesView.updateHeaderButtons(comic);
    }

    unSelect(selectedComicElement) {
        $(selectedComicElement).removeClass('selected-comic');

        this.$detailBackground.off('load', this.detailBackgroundLoadedFunction);
        this.$detailCover.off('load', this.detailCoverLoadedFunction);

        this.$watchButton.off('click', this.watchFunction);
        this.$unWatchButton.off('click', this.unWatchFunction);
        this.$pullButton.off('click', this.pullFunction);
        this.$unPullButton.off('click', this.unPullFunction);
    }
}

class ReleasesView {
    constructor (comicCollection) {
        this._comicCollection = comicCollection;
        this._selectedComicElement = null;
        this._selectedComicContainer = null;
        this.numComics = 0;
        this.retrieveActive = true;

        this.retrieveComicsEvent = new Event(this);
    }

    init() {
        this.createChildren();
        this.setupHandlers();
        this.enable();

        this._initialized = true;
    }

    createChildren() {
        this.$retrieveButton = $('a.comic-list-refresh-button');
        this.$releasesDate = $('div#comic-list-header h1');
        this.$comicList = $('ul#comic-list');

        return this;
    }

    setupHandlers() {
        this.retrieveComicsButtonHandler = this.retrieveComicsButton.bind(this);

        this.retrievedComicsHandler = this.retrievedComics.bind(this);
        this.comicListProcessedHandler = this.comicListProcessed.bind(this);
        this.comicProcessedHandler = this.comicProcessed.bind(this);
        this.comicsStableHandler = this.comicsStable.bind(this);

        return this;
    }

    enable() {
        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);

        this._comicCollection.retrievedComicsEvent.attach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.attach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.attach(this.comicProcessedHandler);
        this._comicCollection.comicsStableEvent.attach(this.comicsStableHandler);

        return true;
    }

    retrieveComicsButton(event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.retrieveComicsEvent.notify();
            this.retrieveActive = false;
            this.$retrieveButton.addClass('disabled');
            this.$comicList.addClass('disabled');
        }
    }

    retrievedComics() {
        this.createList(this._comicCollection.comicsByPublisher);
        if (this._comicCollection.latestDate) {
            this.$releasesDate.text('Releases for ' + this._comicCollection.latestDate.toLocaleDateString("en-US"));
        }
        else {
            this.$releasesDate.text('');
        }
    }

    navigatedTo() {
        let wasInitialized = this._initialized;
        this.init();
        if (wasInitialized) {
            this.retrievedComics();
            this._selectedComicContainer.select(this._selectedComicElement);
        }
    }

    navigatingFrom() {
        this.$retrieveButton.off('click', this.retrieveComicsButtonHandler);

        this._comicCollection.retrievedComicsEvent.unattach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.unattach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.unattach(this.comicProcessedHandler);
        this._comicCollection.comicsStableEvent.unattach(this.comicsStableHandler);
    }

    comicListProcessed (sender, args) {
        this.numComics = args;
    }

    comicProcessed (sender, args) {

    }

    comicsStable (sender, args) {
        this.retrieveActive = true;
        this.$retrieveButton.removeClass('disabled');
        this.$comicList.removeClass('disabled');
    }

    createList(comicList) {
        let $comicList = $('#comic-list');
        let $publisherTemplate = $($('#publisher-template').prop('content')).find('.publisher-group');
        let $comicListTemplate = $($('#comic-list-template').prop('content')).find('.list-comic');

        $comicList.empty();

        for(let key in comicList) {
            if (!comicList.hasOwnProperty(key)) continue;

            let $publisherTemplateClone = $publisherTemplate.clone();
            $($publisherTemplateClone).find('.publisher-heading').text(key);

            let $publisherComics = $($publisherTemplateClone).find('.publisher-list');
            let view = this;


            comicList[key].forEach(function(comic) {
                let $comicListTemplateClone = $comicListTemplate.clone();
                $($comicListTemplateClone).find('.comic-title-list').text(comic.title);
                $($comicListTemplateClone).find('.comic-writer-list').text(comic.writer);
                $($comicListTemplateClone).find('.comic-artist-list').text(comic.artist);

                $comicListTemplateClone[0].comic = comic;

                $comicListTemplateClone.on('click', view.comicSelected.bind(view));

                $comicListTemplateClone.appendTo($publisherComics);
            });

            $publisherTemplateClone.appendTo($comicList);
        }
    }

    comicSelected (event) {
        event.preventDefault();

        let oldSelectedComicElement = this._selectedComicElement;
        let oldSelectedComicContainer = this._selectedComicContainer;

        this._selectedComicElement = event.delegateTarget;
        this._selectedComicContainer = new ComicContainer();

        if(oldSelectedComicContainer){
            oldSelectedComicContainer.unSelect(oldSelectedComicElement);
        }

        this._selectedComicContainer.select(this._selectedComicElement);
    }

    static updateHeaderButtons(comic) {
        let $watchButton = $('a#watch-button');
        let $unWatchButton = $('a#un-watch-button');
        let $pullButton = $('a#pull-button');
        let $unPullButton = $('a#un-pull-button');

        $watchButton.removeClass('button-hidden');
        $unWatchButton.removeClass('button-hidden');
        $pullButton.removeClass('button-hidden');
        $unPullButton.removeClass('button-hidden');

        if (comic.pulled) $pullButton.addClass('button-hidden');
        else $unPullButton.addClass('button-hidden');

        if (comic.watched) $watchButton.addClass('button-hidden');
        else $unWatchButton.addClass('button-hidden');
    }
}

exports = module.exports = ReleasesView;
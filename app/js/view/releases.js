const $ = require('jquery');
const Event = require('../misc/event-dispatcher');

const shell = require('electron').shell;
const logger = require('../misc/logger');
const storageInterface = require('../model/main-window/storage-interface');

const caller = 'ReleasesView';

class ComicContainer {
    constructor() {
        this.$detailBackground = $('img#details-background-img');
        this.$detailTitle = $('div#details-content h1');
        this.$detailCover = $('img#detail-cover');
        this.$detailWriter = $('div#writer-div p.detail');
        this.$detailArtist = $('div#artist-div p.detail');
        this.$detailPublisher = $('div#publisher-div p.detail');
        this.$detailCode = $('div#distributor-code-div a p.detail');
        this.$detailCodeLink = $('div#distributor-code-div a');
        this.$detailPrice = $('div#price-div p.detail');
        this.$detailDescription = $('div#description-div p.detail');
        this.$watchButton = $('a#watch-button');
        this.$unWatchButton = $('a#un-watch-button');
        this.$pullButton = $('a#pull-button');
        this.$unPullButton = $('a#un-pull-button');
        this.$lastPulledDiv = $('div#last-pulled-div');
        this.$lastPulledText = $('p.last-pulled-text');

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

        this.openInBrowserFunction = function(event) {
            event.preventDefault();
            shell.openExternal(this['href']);
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
        this.$detailCodeLink.attr('href', global.detailUrlBase + comic.code);
        this.$detailPrice.text('$' + comic.price.toFixed(2));
        this.$detailDescription.text(comic.description);

        if (comic.lastPulled) {
            this.$lastPulledDiv.removeClass('details-hidden');
            this.$lastPulledText.text(comic.lastPulled);
        }
        else {
            this.$lastPulledDiv.addClass('details-hidden');
        }

        this.watchFunction = function (event) {
            event.preventDefault();
            comic.watch(true);
        };

        this.unWatchFunction = function (event) {
            event.preventDefault();
            comic.watch(false);
        };

        this.pullFunction = function (event) {
            event.preventDefault();
            comic.pull(true);
        };

        this.unPullFunction = function (event) {
            event.preventDefault();
            comic.pull(false);
        };

        this.$watchButton.on('click', this.watchFunction);
        this.$unWatchButton.on('click', this.unWatchFunction);
        this.$pullButton.on('click', this.pullFunction);
        this.$unPullButton.on('click', this.unPullFunction);
        this.$detailCodeLink.on('click', this.openInBrowserFunction);

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
        this.$detailCodeLink.off('click', this.openInBrowserFunction);
    }
}

class ReleasesViewState {
    constructor () {

    }

    save (releasesView) {
        this.filterString = releasesView.$searchInput[0].value;
        this.filtered = releasesView._filtered;

        if (releasesView._selectedComicElement) {
            this.selectedComicOriginalString = releasesView._selectedComicElement.comic.originalString;
        }

        this.scrollPos = releasesView._scrollPos;
    }

    restore (releasesView) {
        if (this.selectedComicOriginalString) this.restoreSelectedComic(releasesView);

        releasesView.$searchInput[0].value = this.filterString;

        releasesView.searchInputKey(
            {
                which: 17,
                preventDefault: function () { }
            } );

        if (this.filtered) {
            releasesView.searchInputKey(
                {
                    which: 13,
                    preventDefault: function () { }
                } );
        }

        $(releasesView.$comicList[0]).scrollTop(this.scrollPos);
    }

    restoreSelectedComic (releasesView) {
        let comicElement = findComicElement(releasesView, this.selectedComicOriginalString);

        if (comicElement) {
            $(comicElement).trigger('click');
        }

        // $(releasesView.$comicList).scrollTop($(comicElement).offset().top);
    }
}

class ReleasesView {
    constructor (comicCollection) {
        this._comicCollection = comicCollection;
        this._selectedComicElement = null;
        this._selectedComicContainer = null;
        this._filtered = false;
        // noinspection JSUnusedGlobalSymbols
        this.numComics = 0;
        this.retrieveActive = true;
        this.state = new ReleasesViewState();

        this.retrieveComicsEvent = new Event(this);
    }

    init() {
        this.createChildren();
        this.setupHandlers();
        this.enable();

        this._initialized = true;
    }

    createChildren() {
        this.$searchAndButtons = $('div#search-and-buttons');
        this.$retrieveButton = $('a#comic-list-refresh-button');
        this.$searchButton = $('a#comic-list-search-button');
        this.$cancelSearchButton = $('a#comic-list-clear-search-button');
        this.$searchInput = $('input#comic-list-search');
        this.$releasesDate = $('div#comic-list-header h1');
        this.$comicList = $('div#comic-list-container');
        this.$comicListWrapper = $('div#comic-list-wrapper');
        this.$comicDetailsNone = $('div#comic-details-none');

        return this;
    }

    setupHandlers() {
        this.searchInputFocusInHandler = this.searchInputFocusIn.bind(this);
        this.searchInputFocusOutHandler = this.searchInputFocusOut.bind(this);
        this.retrieveComicsButtonHandler = this.retrieveComicsButton.bind(this);
        this.searchInputKeyHandler = this.searchInputKey.bind(this);
        this.searchButtonHandler = this.search.bind(this);
        this.searchCancelHandler = this.clearSearch.bind(this);

        this.retrievedComicsHandler = this.retrievedComics.bind(this);
        this.comicListProcessedHandler = this.comicListProcessed.bind(this);
        this.comicProcessedHandler = this.comicProcessed.bind(this);
        this.comicsUnstableHandler = this.comicsUnstable.bind(this);
        this.comicsStableHandler = this.comicsStable.bind(this);
        this.comicListScrolledHandler = this.comicListScrolled.bind(this);

        this.comicSelectedHandler = this.comicSelected.bind(this);
        this.comicPulledHandler = this.comicPulled.bind(this);
        this.comicWatchedHandler = this.comicWatched.bind(this);
        this.comicPullButtonHandler = ReleasesView.comicPullButton.bind(this);

        return this;
    }

    enable() {
        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);

        this.$searchInput.on('focusin', this.searchInputFocusInHandler);
        this.$searchInput.on('focusout', this.searchInputFocusOutHandler);
        this.$searchInput.on('keyup', this.searchInputKeyHandler);
        this.$searchButton.on('click', this.searchButtonHandler);

        this.$cancelSearchButton.on('click', this.searchCancelHandler);
        this.$comicList.on('scroll', this.comicListScrolledHandler);

        this._comicCollection.retrievedComicsEvent.attach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.attach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.attach(this.comicProcessedHandler);
        storageInterface.storageUnstableEvent.attach(this.comicsUnstableHandler);
        storageInterface.storageStableEvent.attach(this.comicsStableHandler);

        this.$comicListWrapper.resizable({
            containment: 'parent',
            handles: 'e, w',
        });
        return true;
    }

    // noinspection JSUnusedLocalSymbols
    searchInputFocusIn (event) {
        this.$searchAndButtons.addClass('focus');
    }

    // noinspection JSUnusedLocalSymbols
    searchInputFocusOut (event) {
        this.$searchAndButtons.removeClass('focus');
    }

    retrieveComicsButton (event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.retrieveComicsEvent.notify();
            this.comicsUnstable();
            this.$comicList.addClass('disabled');
        }
    }

    static comicPullButton (event) {
        event.data.comic.pull(!event.data.comic.pulled);
    }

    searchInputKey (event) {
        if (event.which === 13) {
            this.search(event);
        }
        else if (event.which === 27) {
            this.clearSearch(event);
        }
        else if (this.$searchInput[0].value) {
            this.$cancelSearchButton.removeClass('button-hidden');
        }
        else if (!this._filtered) {
            this.$cancelSearchButton.addClass('button-hidden');
        }
    }

    search (event) {
        event.preventDefault();

        let text = this.$searchInput[0].value;
        let textFilter = /^\W*$/gmi;

        if (textFilter.exec(text)) {
            return;
        }

        for (let group of this.$comicList[0].childNodes) {
            let comicViews = $(group).find('div.publisher-list')[0];
            let numComics = comicViews.childNodes.length;
            let hiddenComics = 0;

            for (let comicView of comicViews.childNodes) {
                // console.log(comicView.comic);
                if (!comicView.hasOwnProperty('comic')) continue;

                $(comicView).removeClass('hidden');

                let comic = comicView.comic;
                let lowerText = text.toLowerCase();

                let comicMatch = comic.title.toLowerCase().includes(lowerText) ||
                                    comic.description.toLowerCase().includes(lowerText) ||
                                    comic.writer.toLowerCase().includes(lowerText) ||
                                    comic.artist.toLowerCase().includes(lowerText) ||
                                    comic.coverArtist.toLowerCase().includes(lowerText);

                if (!comicMatch) {
                    $(comicView).addClass('hidden');
                    hiddenComics++;
                }
            }

            $(group).removeClass('hidden');

            if (hiddenComics === numComics) {
                $(group).addClass('hidden');
            }
        }

        this._filtered = true;
    }

    clearSearch (event) {
        event.preventDefault();

        for (let group of this.$comicList[0].childNodes) {
            let comicViews = $(group).find('div.publisher-list')[0];
            for (let comicView of comicViews.childNodes) {
                $(comicView).removeClass('hidden');
            }

            $(group).removeClass('hidden');
        }

        this.$searchInput[0].value = '';
        this._filtered = false;
        this.$cancelSearchButton.addClass('button-hidden');
    }

    retrievedComics () {
        this.createList(this._comicCollection.comicsByPublisher);
        if (this._comicCollection.latestDate) {
            this.$releasesDate.text('Releases for ' + this._comicCollection.latestDate.toLocaleDateString("en-US"));
        }
        else {
            this.$releasesDate.text('');
        }
    }

    navigatedTo () {
        let wasInitialized = this._initialized;
        this.init();
        if (wasInitialized) {
            this.retrievedComics();
            this.state.restore(this);
        }
    }

    navigatingFrom () {
        this.state.save(this);

        this.$retrieveButton.off('click', this.retrieveComicsButtonHandler);

        this.$searchInput.off('focusin', this.searchInputFocusInHandler);
        this.$searchInput.off('focusout', this.searchInputFocusOutHandler);
        this.$searchInput.off('keyup', this.searchInputKeyHandler);
        this.$searchButton.off('click', this.searchButtonHandler);

        this.$cancelSearchButton.off('click', this.searchCancelHandler);
        this.$comicList.off('scroll', this.comicListScrolledHandler);

        this._comicCollection.retrievedComicsEvent.unattach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.unattach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.unattach(this.comicProcessedHandler);
        storageInterface.storageUnstableEvent.unattach(this.comicsUnstableHandler);
        storageInterface.storageStableEvent.unattach(this.comicsStableHandler);

        this._selectedComicElement = null;
        this._selectedComicContainer = null;
    }

    comicListProcessed (sender, args) {
        // noinspection JSUnusedGlobalSymbols
        this.numComics = args;
    }

    comicProcessed (sender, args) {

    }

    // noinspection JSUnusedLocalSymbols
    comicsUnstable (sender, args) {
        this.retrieveActive = false;
        this.$retrieveButton.addClass('disabled')
    }

    // noinspection JSUnusedLocalSymbols
    comicsStable (sender, args) {
        logger.log('Storage stable', caller);

        this.retrieveActive = true;
        this.$retrieveButton.removeClass('disabled');
        this.$comicList.removeClass('disabled');
    }

    createList (comicList) {
        let $comicList = $('#comic-list-container');
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
                let $pullButton = $($comicListTemplateClone).find('.comic-list-button');

                $($comicListTemplateClone).find('.comic-title-list').text(comic.title);
                $($comicListTemplateClone).find('.comic-writer-list').text(comic.writer);
                $($comicListTemplateClone).find('.comic-artist-list').text(comic.artist);

                comic.pullStatusChanged.attach(view.comicPulledHandler);
                comic.watchStatusChange.attach(view.comicWatchedHandler);

                $comicListTemplateClone[0].comic = comic;

                $comicListTemplateClone.on('click', view.comicSelectedHandler);
                $pullButton.on('click', {comic: comic}, view.comicPullButtonHandler);

                if (comic.pulled) {
                    $pullButton.addClass('active');
                }

                $comicListTemplateClone.appendTo($publisherComics);
            });

            $publisherTemplateClone.appendTo($comicList);
        }
    }

    comicSelected (event) {
        event.preventDefault();

        // We don't want to select a comic in cases where the target is the pull button
        if (event.target.classList.contains('comic-list-button') ||
            event.target.parentNode.classList.contains('comic-list-button')) {
            return;
        }

        let oldSelectedComicElement = this._selectedComicElement;
        let oldSelectedComicContainer = this._selectedComicContainer;

        this._selectedComicElement = event.delegateTarget;
        this._selectedComicContainer = new ComicContainer();

        if(oldSelectedComicContainer){
            oldSelectedComicContainer.unSelect(oldSelectedComicElement);
        }

        this._selectedComicContainer.select(this._selectedComicElement);

        this.$comicDetailsNone.hide();
    }

    comicPulled (sender, args) {
        let comic = sender;
        let comicElement = findComicElement (this, comic.originalString);
        let pulledButton = $(comicElement).find('.comic-list-button')[0];

        if (args) {
            $(pulledButton).addClass('active');
        }
        else {
            $(pulledButton).removeClass('active');
        }

        if (comicElement === this._selectedComicElement) {
            ReleasesView.updateHeaderButtons(comic);
        }
    }

    comicWatched (sender, args) {
        let comic = sender;
        let comicElement = findComicElement (this, comic.originalString);

        if (comicElement === this._selectedComicElement) {
            ReleasesView.updateHeaderButtons(comic);
        }
    }

    // noinspection JSUnusedLocalSymbols
    comicListScrolled (event) {
        this._scrollPos = $(this.$comicList[0]).scrollTop();
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

function findComicElement (releasesView, comicOriginalString) {
    for (let group of releasesView.$comicList[0].childNodes) {
        let comicViews = $(group).find('div.publisher-list')[0];

        for (let comicView of comicViews.childNodes) {
            if (!comicView.hasOwnProperty('comic')) continue;

            let comic = comicView.comic;

            let comicMatch = comic.originalString === comicOriginalString;

            if (comicMatch) return comicView;
        }
    }

    return null;
}

exports = module.exports = ReleasesView;
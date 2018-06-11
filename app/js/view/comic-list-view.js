const View = require('./view');

const { remote, ipcRenderer, shell } = require('electron');
const userPrefs = remote.getGlobal('userPrefs');
const Event = require('../misc/event-dispatcher');
const logger = require('../misc/logger');
const storageInterface = require('../model/main-window/storage-interface');
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class ComicContainer {
    constructor(view) {
        this.view = view;

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

        this.detailBackgroundLoadedFunction = null;
        this.detailCoverLoadedFunction = null;
    }

    select (selectedComicElement) {
        let comic = selectedComicElement.comic;

        $(selectedComicElement).addClass('selected-comic');

        this.update (comic);
    }

    update(comic) {
        let container = this;

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

        this.$watchButton.on('click', this.view.watchSelectedModeComicHandler);
        this.$unWatchButton.on('click', this.view.unWatchSelectedModelComicHandler);
        this.$pullButton.on('click', this.view.pullSelectedModelComicHandler);
        this.$unPullButton.on('click', this.view.unPullSelectedModelComicHandler);
        this.$detailCodeLink.on('click', this.openInBrowserFunction);

        ComicListView.updateHeaderButtons(comic);
    }

    unSelect(selectedComicElement) {
        $(selectedComicElement).removeClass('selected-comic');

        this.$detailBackground.off('load', this.detailBackgroundLoadedFunction);
        this.$detailCover.off('load', this.detailCoverLoadedFunction);

        this.$watchButton.off('click', this.view.watchSelectedModeComicHandler);
        this.$unWatchButton.off('click', this.view.unWatchSelectedModelComicHandler);
        this.$pullButton.off('click', this.view.pullSelectedModelComicHandler);
        this.$unPullButton.off('click', this.view.unPullSelectedModelComicHandler);
        this.$detailCodeLink.off('click', this.openInBrowserFunction);
    }
}

class ComicListViewState {
    constructor () {
        this.saved = false;
    }

    save (releasesView) {
        this.filterString = releasesView.$searchInput[0].value;
        this.filtered = releasesView._filtered;

        if (releasesView._selectedComicElement) {
            this.selectedComicOriginalString = releasesView._selectedComicElement.comic.originalString;
        }

        this.scrollPos = releasesView._scrollPos;

        this.saved = true;
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

        this.saved = false
    }

    restoreSelectedComic (releasesView) {
        let comicElement = findComicElement(releasesView, this.selectedComicOriginalString);

        if (comicElement) {
            $(comicElement).trigger('click');
        }
    }
}

// TODO Ensure that state is properly restored when comic list date has been changed
class ComicListView extends View  {
    constructor (comicCollection) {
        super();

        this.callerString = 'ComicListView';
        this._comicCollection = comicCollection;
        this._selectedComicElement = null;
        this._selectedComicContainer = null;
        this._filtered = false;
        // noinspection JSUnusedGlobalSymbols
        this.numComics = 0;
        this.state = new ComicListViewState();

        this.refreshedListEvent = new Event(this);

    }

    createChildren() {
        this.$searchAndButtons = $('div#search-and-buttons');
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
        this.searchInputKeyHandler = this.searchInputKey.bind(this);
        this.searchButtonHandler = this.search.bind(this);
        this.searchCancelHandler = this.clearSearch.bind(this);

        this.retrievedComicsHandler = this.retrievedComics.bind(this);
        this.comicListProcessedHandler = this.comicListProcessed.bind(this);
        this.comicProcessedHandler = this.comicProcessed.bind(this);
        this.comicsUnstableHandler = this.comicsUnstable.bind(this);
        this.comicsStableHandler = this.comicsStable.bind(this);
        this.comicListScrolledHandler = this.comicListScrolled.bind(this);

        this.comicElementSelectedHandler = this.comicElementSelected.bind(this);
        this.modelComicPulledHandler = this.modelComicPulled.bind(this);
        this.modelComicWatchedHandler = this.modelComicWatched.bind(this);
        this.comicPullButtonHandler = this.comicPullButton.bind(this);

        this.watchSelectedModeComicHandler = this.watchSelectedModeComic.bind(this);
        this.unWatchSelectedModelComicHandler = this.unWatchSelectedModelComic.bind(this);
        this.pullSelectedModelComicHandler = this.pullSelectedModelComic.bind(this);
        this.unPullSelectedModelComicHandler = this.unPullSelectedModelComic.bind(this);

        return this;
    }

    enable() {
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
            handles: 'e',
        });

        let includeReprints = userPrefs['includeReprints'];

        if (Utilities.exists(includeReprints)) {
            this.includeReprints = includeReprints;
        }
        else {
            this.includeReprints = false;
            ipcRenderer.send(ipcChannels.prefSet, { key: 'includeReprints', value: this.includeReprints });
        }

        return this;
    }

    navigatedTo () {
        super.navigatedTo();

        if (this._comicCollection.retrievedComicsEvent.fired) {
            this.retrievedComics();
        }

        if (this.state.saved) {
            this.state.restore(this);
        }
    }

    navigatingFrom () {
        super.navigatingFrom();

        this.state.save(this);

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

        this.disconnectComics();
    }

    disconnectComics () {
        for (let comicKey in this._comicCollection.comicDict) {
            if (!this._comicCollection.comicDict.hasOwnProperty(comicKey)) continue;

            let comic = this._comicCollection.comicDict[comicKey];

            comic.pullStatusChanged.unattach(this.modelComicPulledHandler);
            comic.watchStatusChange.unattach(this.modelComicWatchedHandler);
        }
    }

    // noinspection JSUnusedLocalSymbols
    searchInputFocusIn(event) {
        this.$searchAndButtons.addClass('focus');
    }

    // noinspection JSUnusedLocalSymbols
    searchInputFocusOut(event) {
        this.$searchAndButtons.removeClass('focus');
    }

    // This can't be static because the methods that override it may rely on class data
    // noinspection JSMethodCanBeStatic
    comicPullButton(event) {
        event.data.comic.pull(!event.data.comic.pulled);
    }

    searchInputKey(event) {
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

    search(event) {
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

    clearSearch(event) {
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

    retrievedComics() {
        this.createList(this._comicCollection.comicsByPublisher);
        if (this._comicCollection.currentDate) {
            this.$releasesDate.text(this.generateDateString());
        }
        else {
            this.$releasesDate.text('');
        }

        this.readyToView = true;
    }

    comicListProcessed(sender, numComics) {
        // noinspection JSUnusedGlobalSymbols
        this.numComics = numComics;
    }

    comicProcessed(sender, comic) {
        if (!this._selectedComicContainer) return;

        if (comic === this._selectedComicElement.comic) {
            this._selectedComicContainer.update(comic);
        }
    }

    // noinspection JSUnusedLocalSymbols
    comicsUnstable(sender, args) {
        this.retrieveActive = false;
    }

    // noinspection JSUnusedLocalSymbols
    comicsStable(sender, args) {
        logger.log('Storage stable', this.callerString);

        this.retrieveActive = true;
        this.$comicList.removeClass('disabled');
    }

    createList(comicsByPublisher) {
        let $comicList = $('#comic-list-container');
        let $publisherTemplate = $($('#publisher-template').prop('content')).find('.publisher-group');
        let $comicListTemplate = $($('#comic-list-template').prop('content')).find('.list-comic');

        $comicList.empty();

        for (let publisher in comicsByPublisher) {
            if (!comicsByPublisher.hasOwnProperty(publisher)) continue;

            let $publisherTemplateClone = $publisherTemplate.clone();

            $($publisherTemplateClone).find('.publisher-heading').text(publisher);

            let $publisherComics = $($publisherTemplateClone).find('.publisher-list');
            let view = this;
            let comicCount = 0;

            comicsByPublisher[publisher].forEach(function (comic) {
                if (view.defaultComicListFilter(comic)) {
                    let $comicListTemplateClone = $comicListTemplate.clone();
                    let $pullButton = $($comicListTemplateClone).find('.comic-list-button');

                    $($comicListTemplateClone).find('.comic-title-list').text(comic.title);
                    $($comicListTemplateClone).find('.comic-writer-list').text(comic.writer);
                    $($comicListTemplateClone).find('.comic-artist-list').text(comic.artist);

                    comic.pullStatusChanged.attach(view.modelComicPulledHandler);
                    comic.watchStatusChange.attach(view.modelComicWatchedHandler);

                    $comicListTemplateClone[0].comic = comic;

                    $comicListTemplateClone.on('click', view.comicElementSelectedHandler);
                    $pullButton.on('click', {comic: comic}, view.comicPullButtonHandler);

                    if (comic.pulled) {
                        $pullButton.addClass('active');
                    }

                    $comicListTemplateClone.appendTo($publisherComics);
                    comicCount++;
                }
            });

            if (comicCount) $publisherTemplateClone.appendTo($comicList);
        }

        this.refreshedListEvent.notify()
    }

    comicElementSelected(event) {
        event.preventDefault();

        // We don't want to select a comic in cases where the target is the pull button
        if (event.target.classList.contains('comic-list-button') ||
            event.target.parentNode.classList.contains('comic-list-button')) {
            return;
        }

        let oldSelectedComicElement = this._selectedComicElement;
        let oldSelectedComicContainer = this._selectedComicContainer;

        this._selectedComicElement = event.delegateTarget;
        this._selectedComicContainer = new ComicContainer(this);

        if (oldSelectedComicContainer) {
            oldSelectedComicContainer.unSelect(oldSelectedComicElement);
        }

        this._selectedComicContainer.select(this._selectedComicElement);

        this.$comicDetailsNone.hide();
    }

    modelComicPulled(sender, args) {
        let comic = sender;
        let comicElement = findComicElement(this, comic.originalString);
        let pulledButton = $(comicElement).find('.comic-list-button')[0];

        if (args) {
            $(pulledButton).addClass('active');
        }
        else {
            $(pulledButton).removeClass('active');
        }

        if (comicElement === this._selectedComicElement) {
            ComicListView.updateHeaderButtons(comic);
        }
    }

    // noinspection JSUnusedLocalSymbols
    modelComicWatched(sender, args) {
        let comic = sender;
        let comicElement = findComicElement(this, comic.originalString);

        if (comicElement === this._selectedComicElement) {
            ComicListView.updateHeaderButtons(comic);
        }
    }

    watchSelectedModeComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.watch(true);
    };

    unWatchSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.watch(false);
    };

    pullSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.pull(true);
    };

    unPullSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.pull(false);
    };

    // noinspection JSUnusedLocalSymbols
    comicListScrolled(event) {
        this._scrollPos = $(this.$comicList[0]).scrollTop();
    }

    // This can't be static because the methods that override it may rely on class data
    // noinspection JSMethodCanBeStatic
    generateDateString () {
        return 'Uh oh, this wasn\' overriden correctly!';
    }

    // This can't be static because the methods that override it may rely on class data
    // noinspection JSMethodCanBeStatic
    defaultComicListFilter (comic) {
        return comic.reprint === this.includeReprints;
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

exports.ComicContainer = module.exports.ComicContainer = ComicContainer;
exports.ComicListViewState = module.exports.ComicListViewState = ComicListViewState;
exports.ComicListView = module.exports.ComicListView = ComicListView;
exports.findComicElement = module.exports.findComicElement = findComicElement;
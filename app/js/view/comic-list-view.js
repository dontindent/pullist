const View = require('./view');

const {
    remote,
    ipcRenderer,
    shell
} = require('electron');
const userPrefs = remote.getGlobal('userPrefs');
const Event = require('../misc/event-dispatcher');
const logger = require('../misc/logger');
// eslint-disable-next-line no-unused-vars
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class ComicContainer {
    constructor(view, alertService) {
        this.view = view;
        this.alertService = alertService;

        this.$detailBackground = $('img#details-background-img');
        this.$detailTitle = $('div#details-content h1');
        this.$detailCoverLink = $('a#detail-cover-link');
        this.$detailCover = $('img#detail-cover');
        this.$detailWriter = $('div#writer-div p.detail');
        this.$detailArtist = $('div#artist-div p.detail');
        this.$detailPublisher = $('div#publisher-div p.detail');
        this.$detailCode = $('div#distributor-code-div a p.detail');
        this.$detailCodeLink = $('div#distributor-code-div a');
        this.$detailPrice = $('div#price-div p.detail');
        this.$detailDescription = $('div#description-div p.detail');
        this.$watchButton = $('button#watch-button');
        this.$unWatchButton = $('button#un-watch-button');
        this.$pullButton = $('button#pull-button');
        this.$unPullButton = $('button#un-pull-button');
        this.$lastPulledDiv = $('div#last-pulled-div');
        this.$lastPulledText = $('p.last-pulled-text');

        this.detailBackgroundLoadedFunction = null;
        this.detailCoverLoadedFunction = null;

        this.includeReprints = false;

        if (typeof userPrefs.includeReprints === typeof true) {
            this.includeReprints = userPrefs.includeReprints;
        } else {
            ipcRenderer.send(ipcChannels.prefSet, {
                key: 'includeReprints',
                value: this.includeReprints
            });
        }

        this._detailBackgroundLoadedHandler = this._onDetailBackgroundLoaded
            .bind(this);
        this._detailCoverLoadedHandler = this._onDetailCoverLoaded.bind(
            this);
        this._openInBrowserHandler = this._openInBrowser.bind(this);
        this._detailCoverLinkClickHandler = this._onDetailCoverLinkClick.bind(
            this);
        this._variantPullClickHandler = this._onVariantPullClick.bind(this);
    }

    //#region Private Event Handlers

    _onDetailBackgroundLoaded () {
        this.$detailBackground.removeClass('hidden-opacity');
    }

    _onDetailCoverLoaded () {
        this.$detailCover.removeClass('hidden-opacity');
    }

    _openInBrowser (event) {
        event.preventDefault();
        let link = event.delegateTarget;

        shell.openExternal(link.href);
    }

    _onDetailCoverLinkClick (event) {
        event.preventDefault();

        this.alertService.showCoverOverlay(this.view._electronHelper, this.view
            ._selectedComicElement.comic, this._variantPullClickHandler);
    }

    _onVariantPullClick (newMain) {        
        newMain.makeMain();
        newMain.pulled = true;
    }

    //#endregion

    select(selectedComicElement) {
        let comic = selectedComicElement.comic;

        $(selectedComicElement).addClass('selected-comic');

        this.update(comic);
    }

    update(comic, handlers = true) {
        if (handlers) {
            this.$detailBackground.on('load', this._detailBackgroundLoadedHandler);
            this.$detailCover.on('load', this._detailCoverLoadedHandler);
            this.$detailCoverLink.on('click', this._detailCoverLinkClickHandler);
            this.$watchButton.on('click', this.view.watchSelectedModeComicHandler);
            this.$unWatchButton.on('click', this.view.unWatchSelectedModelComicHandler);
            this.$pullButton.on('click', this.view.pullSelectedModelComicHandler);
            this.$unPullButton.on('click', this.view.unPullSelectedModelComicHandler);
            this.$detailCodeLink.on('click', this._openInBrowserHandler);
        }

        this.$detailBackground.addClass('hidden-opacity');
        this.$detailBackground.attr('src', comic.coverURL);
        this.$detailTitle.text(comic.title);
        this.$detailCover.addClass('hidden-opacity');
        this.$detailCover.attr('src', comic.coverURL);
        this.$detailWriter.text(comic.writer);
        this.$detailArtist.text(comic.artist);
        this.$detailPublisher.text(comic.publisher);
        this.$detailCode.text(comic.code);
        this.$detailCodeLink.attr('href', global.detailUrlBase + comic.code);
        this.$detailPrice.text('$' + comic.price.toFixed(2));
        this.$detailDescription.text(comic.description);

        if (comic.lastPulled) {
            this.$lastPulledDiv.removeClass('hidden-opacity');
            this.$lastPulledText.text(comic.lastPulled);
        } else {
            this.$lastPulledDiv.addClass('hidden-opacity');
        }

        ComicListView.updateHeaderButtons(comic);
    }

    unSelect(selectedComicElement, refresh = false) {
        if (!refresh) $(selectedComicElement).removeClass('selected-comic');

        this.$detailBackground.off('load', this._detailBackgroundLoadedHandler);
        this.$detailCover.off('load', this._detailCoverLoadedHandler);
        this.$detailCoverLink.off('click', this._detailCoverLinkClickHandler);

        this.$watchButton.off('click', this.view.watchSelectedModeComicHandler);
        this.$unWatchButton.off('click', this.view.unWatchSelectedModelComicHandler);
        this.$pullButton.off('click', this.view.pullSelectedModelComicHandler);
        this.$unPullButton.off('click', this.view.unPullSelectedModelComicHandler);
        this.$detailCodeLink.off('click', this._openInBrowserHandler);
    }
}

class ComicListViewState {
    constructor() {
        this.saved = false;
    }

    save(releasesView) {
        this.filterString = releasesView.$searchInput[0].value;
        this.filtered = releasesView._filtered;

        if (releasesView._selectedComicElement) {
            this.selectedComicOriginalString = releasesView._selectedComicElement
                .comic.originalString;
        }

        this.scrollPos = releasesView._scrollPos;
        this.date = releasesView._comicCollection.currentDate;

        this.saved = true;
    }

    restore(releasesView) {
        if (this.selectedComicOriginalString) this.restoreSelectedComic(
            releasesView);

        releasesView.$searchInput[0].value = this.filterString;

        releasesView.searchInputKey({
            which: 17,
            preventDefault: function() {}
        });

        if (this.filtered) {
            releasesView.searchInputKey({
                which: 13,
                preventDefault: function() {}
            });
        }

        $(releasesView.$comicList[0]).scrollTop(this.scrollPos);

        this.saved = false;

        logger.log('Save state restored', releasesView.callerString);
    }

    restoreSelectedComic(releasesView) {
        let comicElement = findComicElement(releasesView, this.selectedComicOriginalString);

        if (comicElement) {
            $(comicElement).trigger('click');
        }
    }
}

class ComicListView extends View {
    constructor(comicCollection, storageInterface, alertService, electronHelper) {
        super();

        this.callerString = 'ComicListView';
        this._comicCollection = comicCollection;
        this._storageInterface = storageInterface;
        this._alertService = alertService;
        this._electronHelper = electronHelper;
        this._selectedComicElement = null;
        this._selectedComicContainer = null;
        this._filtered = false;
        // noinspection JSUnusedGlobalSymbols
        this.numComics = 0;
        this.state = new ComicListViewState();

        this.refreshedListEvent = new Event(this);
        this.needLastComicPulledEvent = new Event(this);
    }

    // #region Setup

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
        this.searchButtonHandler = this._onSearch.bind(this);
        this.searchCancelHandler = this._omClearSearch.bind(this);
        this.searchInputFocusInHandler = this._onSearchInputFocusIn.bind(this);
        this.searchInputFocusOutHandler = this._onSearchInputFocusOut.bind(this);
        this.searchInputKeyHandler = this._onSearchInputKeyUp.bind(this);

        this.comicListProcessedHandler = this._onAllComicsProcessed.bind(this);
        this.comicListScrolledHandler = this._onComicListScrolled.bind(this);
        this.comicProcessedHandler = this._onSingleComicProcessed.bind(this);
        this.comicsStableHandler = this._onComicsStable.bind(this);
        this.comicsUnstableHandler = this._onComicsUnstable.bind(this);
        this.retrievedComicsHandler = this._onRetrievedComics.bind(this);

        this.comicElementSelectedHandler = this._onComicElementSelected.bind(this);
        this.comicPullButtonHandler = this._onComicPullButtonClick.bind(this);
        this.modelComicLastPulledUpdateHandler = this._omModelComicLastPulledUpdate.bind(this);
        this.modelComicMainChangedHandler= this._onModelComicMainChanged.bind(this);
        this.modelComicPulledHandler = this._onModelComicPulled.bind(this);
        this.modelComicWatchedHandler = this._onModelComicWatched.bind(this);
        
        this.pullSelectedModelComicHandler = this._onPullSelectedModelComic.bind(this);
        this.unPullSelectedModelComicHandler = this._onUnPullSelectedModelComic.bind(this);
        this.unWatchSelectedModelComicHandler = this._onUnWatchSelectedModelComic.bind(this);
        this.watchSelectedModeComicHandler = this._onWatchSelectedModelComic.bind(this);

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
        this._comicCollection.lastIssueUpdatedEvent.attach(this.modelComicLastPulledUpdateHandler);
        this._storageInterface.storageUnstableEvent.attach(this.comicsUnstableHandler);
        this._storageInterface.storageStableEvent.attach(this.comicsStableHandler);

        this.$comicListWrapper.resizable({
            containment: 'parent',
            handles: 'e',
        });

        return this;
    }

    //#endregion

    // #region Handlers
    
    _onAllComicsProcessed (sender, numComics) {
        // noinspection JSUnusedGlobalSymbols
        this.numComics = numComics;
    }

    _omClearSearch (event) {
        event.preventDefault();

        for (let group of this.$comicList[0].childNodes) {
            let comicViews = $(group).find('div.publisher-list')[0];
            for (let comicView of comicViews.childNodes) {
                $(comicView).removeClass('hidden-display');
            }

            $(group).removeClass('hidden-display');
        }

        this.$searchInput[0].value = '';
        this._filtered = false;
        this.$cancelSearchButton.addClass('hidden-display');
    }

    _onComicElementSelected (event) {
        event.preventDefault();

        // We don't want to select a comic in cases where the target is the pull button
        if (event.target.classList.contains('comic-list-button') ||
            event.target.parentNode.classList.contains('comic-list-button')) {
            return;
        }

        let oldSelectedComicElement = this._selectedComicElement;
        let oldSelectedComicContainer = this._selectedComicContainer;

        this._selectedComicElement = event.delegateTarget;
        this._selectedComicContainer = new ComicContainer(this, this._alertService);

        if (oldSelectedComicContainer) {
            oldSelectedComicContainer.unSelect(oldSelectedComicElement);
        }

        this._selectedComicContainer.select(this._selectedComicElement);

        let comic = this._selectedComicElement.comic;
        if (Date.compareDates(comic.lastPulledDate, new Date(-
                8640000000000000))) {
            this.needLastComicPulledEvent.notify(comic);
        }

        logger.log(['New element selected for:', comic.title], this.callerString);

        this.$comicDetailsNone.hide();
    }

    _onComicListScrolled () {
        this._scrollPos = $(this.$comicList[0]).scrollTop();
    }

    // This can't be static because the methods that override it may rely on class data
    _onComicPullButtonClick (event) {
        event.data.comic.pulled = !event.data.comic.pulled;
    }

    _onComicsStable () {
        logger.log('Storage stable', this.callerString);
    }

    _onComicsUnstable () {
    }

    _omModelComicLastPulledUpdate (sender, args) {
        let comic = args;
        if (this._selectedComicElement.comic === comic) {
            this._selectedComicContainer.update(comic, false);
        }
    }

    _onModelComicMainChanged (sender) {
        let oldMain = sender;

        this.updateComicElement(this, oldMain.mainComic, this._selectedComicElement);
        this._selectedComicContainer.update(oldMain.mainComic);

    }

    _onModelComicPulled (sender, args) {
        let comic = sender;
        let comicElement = findComicElement(this, comic.originalString);
        let pulledButton = $(comicElement).find('.comic-list-button')[0];

        if (args) {
            $(pulledButton).addClass('active');
        } else {
            $(pulledButton).removeClass('active');
        }

        if (comicElement === this._selectedComicElement) {
            ComicListView.updateHeaderButtons(comic);
        }
    }

    _onModelComicWatched (sender) {
        let comic = sender;
        let comicElement = findComicElement(this, comic.originalString);

        if (comicElement === this._selectedComicElement) {
            ComicListView.updateHeaderButtons(comic);
        }
    }

    _onPullSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.pulled = true;
    }

    _onRetrievedComics (sender, args) {
        if (args && args[0].fired) {
            logger.log('Comic list was already populated', this.callerString);
        } else {
            logger.log('Comic list has been loaded/retrieved', this.callerString);
        }

        this.createList(this._comicCollection.comicsByPublisher);
        if (this._comicCollection.currentDate) {
            this.$releasesDate.text(this.generateDateString());
        } else {
            this.$releasesDate.text('');
        }

        this.readyToView = true;
    }

    _onSearch (event) {
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

                $(comicView).removeClass('hidden-display');

                let comic = comicView.comic;
                let lowerText = text.toLowerCase();

                let comicMatch = comic.title.toLowerCase().includes(
                        lowerText) ||
                    comic.description.toLowerCase().includes(lowerText) ||
                    comic.writer.toLowerCase().includes(lowerText) ||
                    comic.artist.toLowerCase().includes(lowerText) ||
                    comic.coverArtist.toLowerCase().includes(lowerText);

                if (!comicMatch) {
                    $(comicView).addClass('hidden-display');
                    hiddenComics++;
                }
            }

            $(group).removeClass('hidden-display');

            if (hiddenComics === numComics) {
                $(group).addClass('hidden-display');
            }
        }

        this._filtered = true;
    }

    _onSearchInputFocusIn () {
        this.$searchAndButtons.addClass('focus');
    }

    _onSearchInputFocusOut () {
        this.$searchAndButtons.removeClass('focus');
    }

    _onSearchInputKeyUp (event) {
        if (event.which === 13) {
            this._onSearch(event);
        } else if (event.which === 27) {
            this._omClearSearch(event);
        } else if (this.$searchInput[0].value) {
            this.$cancelSearchButton.removeClass('hidden-display');
        } else if (!this._filtered) {
            this.$cancelSearchButton.addClass('hidden-display');
        }
    }

    _onSingleComicProcessed (sender, comic) {
        if (!this._selectedComicContainer) return;

        if (comic === this._selectedComicElement.comic) {
            this._selectedComicContainer.update(comic);
        }
    }

    _onWatchSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.watched = true;
    }

    _onUnPullSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.pulled = false;
    }

    _onUnWatchSelectedModelComic (event) {
        event.preventDefault();
        this._selectedComicElement.comic.watched = false;
    }

    // #endregion

    navigatedTo () {
        super.navigatedTo();

        if (this.state.saved && this.readyToRestore()) {
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
        this._comicCollection.lastIssueUpdatedEvent.unattach(this.modelComicLastPulledUpdateHandler);
        this._storageInterface.storageUnstableEvent.unattach(this.comicsUnstableHandler);
        this._storageInterface.storageStableEvent.unattach(this.comicsStableHandler);

        this._selectedComicElement = null;
        this._selectedComicContainer = null;

        this.refreshedListEvent.clear();

        this.disconnectComics();
    }

    disconnectComics () {
        for (let comic of this._comicCollection.comicDict.values()) {
            comic.pullStatusChangedEvent.unattach(this.modelComicPulledHandler);
            comic.watchStatusChangedEvent.unattach(this.modelComicWatchedHandler);
        }
    }

    createList (comicsByPublisher) {
        if (!this.shouldCreateList()) return;

        let view = this;
        let elementCount = 0;
        let $comicList = $('#comic-list-container');
        let $publisherTemplate = $($('#publisher-template').prop('content')).find(
            '.publisher-group'
        );

        $comicList.empty();

        for (var publisher of comicsByPublisher.keys()) {
            let $publisherTemplateClone = $publisherTemplate.clone();

            let comicCount = this.createPublisherGroup(
                $publisherTemplateClone, 
                view, 
                publisher,
                comicsByPublisher
            );

            elementCount += comicCount;

            if (comicCount) {
                $publisherTemplateClone.appendTo($comicList);
            }
        }

        logger.log(['Created', elementCount, 'comic elements for list'],
            this.callerString);
        this.refreshedListEvent.notify(null);
    }

    createPublisherGroup ($publisherTemplate, view, publisher, comicsByPublisher) {
        $($publisherTemplate).find('.publisher-heading').text(publisher);

        let $publisherComics = $($publisherTemplate).find('.publisher-list');
        let comicCount = 0;
        let $comicListTemplate = $($('#comic-list-template').prop('content'))
            .find('.list-comic');

        for (let comic of comicsByPublisher.get(publisher)) {
            comicCount += this.createComicElement(view, comic,
                $comicListTemplate, $publisherComics);
        }

        return comicCount;
    }

    createComicElement (view, comic, $comicListTemplate, $publisherComics) {
        if (view.defaultComicListFilter(comic)) {
            let $comicListTemplateClone = $comicListTemplate.clone();
            let $pullButton = $($comicListTemplateClone).find('.comic-list-button');

            $($comicListTemplateClone).find('.comic-title-list').text(comic.title);
            $($comicListTemplateClone).find('.comic-writer-list').text(comic.writer);
            $($comicListTemplateClone).find('.comic-artist-list').text(comic.artist);

            comic.pullStatusChangedEvent.attach(view.modelComicPulledHandler);
            comic.watchStatusChangedEvent.attach(view.modelComicWatchedHandler);
            comic.mainUpdatedEvent.attach(view.modelComicMainChangedHandler);
            $comicListTemplateClone[0].comic = comic;
            $comicListTemplateClone.on('click', view.comicElementSelectedHandler);
            $pullButton.on('click', {
                comic: comic
            }, view.comicPullButtonHandler);

            if (comic.pulled) {
                $pullButton.addClass('active');
            }

            $comicListTemplateClone.appendTo($publisherComics);

            return 1;
        }

        return 0;
    }

    updateComicElement (view, comic, comicElement) {
        let $pullButton = $(comicElement).find('.comic-list-button');

        // Unattach the previous listenters from the old comic
        comic.pullStatusChangedEvent.unattach(view.modelComicPulledHandler);
        comic.watchStatusChangedEvent.unattach(view.modelComicWatchedHandler);
        comic.mainUpdatedEvent.unattach(view.modelComicMainChangedHandler);
        $pullButton.off('click', view.comicPullButtonHandler);

        // Attach event listeners to the new comic
        comic.pullStatusChangedEvent.attach(view.modelComicPulledHandler);
        comic.watchStatusChangedEvent.attach(view.modelComicWatchedHandler);
        comic.mainUpdatedEvent.attach(view.modelComicMainChangedHandler);
        comicElement.comic = comic;
        $pullButton.on('click', {
            comic: comic
        }, view.comicPullButtonHandler);

        if (comic.pulled) {
            $pullButton.addClass('active');
        }
        else {
            $pullButton.removeClass('active');
        }

    }

    // This can't be static because the methods that override it may rely on class data
    // noinspection JSMethodCanBeStatic
    generateDateString () {
        return 'Uh oh, this wasn\'t overriden correctly!';
    }

    // This can't be static because the methods that override it may rely on class data
    // noinspection JSMethodCanBeStatic
    defaultComicListFilter (comic) {
        return this.includeReprints ? true : !comic.reprint;
        // return comic.reprint === this.includeReprints;
    }

    static updateHeaderButtons (comic) {
        let $watchButton = $('button#watch-button');
        let $unWatchButton = $('button#un-watch-button');
        let $pullButton = $('button#pull-button');
        let $unPullButton = $('button#un-pull-button');

        $watchButton.removeClass('hidden-display');
        $unWatchButton.removeClass('hidden-display');
        $pullButton.removeClass('hidden-display');
        $unPullButton.removeClass('hidden-display');

        if (comic.pulled) $pullButton.addClass('hidden-display');
        else $unPullButton.addClass('hidden-display');

        if (comic.watched) $watchButton.addClass('hidden-display');
        else $unWatchButton.addClass('hidden-display');
    }

    readyToRestore () {
        return true;
    }

    shouldCreateList () {
        return true;
    }
}

function findComicElement(releasesView, comicOriginalString) {
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
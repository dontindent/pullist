const { ComicListView } = require('./comic-list-view');
const Event = require('../misc/event-dispatcher');
// noinspection JSUnusedLocalSymbols
const logger = require("../misc/logger");
const Utilities = require("../misc/utilities");

class ReleasesView extends ComicListView {
    constructor (comicCollection, storageInterface, alertService, electronHelper) {
        super(comicCollection, storageInterface, alertService, electronHelper);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'ReleasesView';
        this.retrieveActive = true;
        this.processedComics = 0;

        this.notLatestDateEvent = new Event(this);
        this.retrieveComicsEvent = new Event(this);
    }

    // #region Setup

    createChildren () {
        super.createChildren();
        this.$retrieveButton = $('a#comic-list-refresh-button');
        this.$retrieveStatusContainer = $('div#comic-retrieve-status-container');
        this.$retrieveStatusMessage = $('span#comic-retrieve-message');
        this.$progressBarContainer = $('div#progress-bar');
    }

    setupHandlers () {
        super.setupHandlers();
        this.retrieveComicsButtonHandler = this._onRetrieveComicsButtonClick.bind(this);
        this.comicsStoredHandler = this._onComicsStored.bind(this);
    }

    enable () {
        super.enable();

        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);
        this._comicCollection.comicsStoredEvent.attach(this.comicsStoredHandler);
    }

    // #endregion

    // #region Handlers

    _onAllComicsProcessed (sender, numComics) {
        super._onAllComicsProcessed(sender, numComics);

        this.processedComics = 0;
        this.$retrieveStatusMessage.text('Comic list retrieved');
    }

    _onComicsStable (sender, args) {
        super._onComicsStable(sender, args);

        this.retrieveActive = true;
        this.$comicList.removeClass('disabled');
        this.$retrieveButton.removeClass('disabled');
    }

    _onComicsStored () {
        this.$retrieveStatusContainer.addClass('status-hidden');
        this.$progressBarContainer[0].style.width = '0%';
    }

    _onComicsUnstable (sender, args) {
        super._onComicsUnstable(sender, args);

        this.retrieveActive = false;
        this.$retrieveButton.addClass('disabled');
    }

    _onRetrievedComics (sender, args, status) {
        super._onRetrievedComics(sender, args, status);

        if (!Date.compareDates(
            this._comicCollection.currentDate, 
            this._comicCollection.latestDate
        )) {
            this.notLatestDateEvent.notify();
        }        
        else if (this.state.saved && this.readyToRestore()) {
            this.state.restore(this);
        }
    }

    // TODO Make sure that other views can't disrupt the comic retrieval process...
    _onRetrieveComicsButtonClick (event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.$retrieveStatusContainer.removeClass('status-hidden');
            this.$retrieveStatusMessage.text('Retrieving comic list');
            this.disconnectComics();
            this.retrieveComicsEvent.notify();
            this._onComicsUnstable();
            this.$comicList.addClass('disabled');
        }
    }

    _onSingleComicProcessed (sender, comic) {
        super._onSingleComicProcessed(sender, comic);

        this.processedComics++;
        this.$retrieveStatusMessage.text(comic.title);

        if (this.processedComics === this.numComics) {
            this.$retrieveStatusMessage.text('Storing comics');
            
            this.$comicList.removeClass('disabled');
        }
        else {
            let percentComplete = (this.processedComics / this.numComics) * 100;
            this.$progressBarContainer[0].style.width = percentComplete.toString() + '%';
        }
    }

    // #endregion

    navigatedTo () {
        super.navigatedTo();

        if (this._comicCollection.latestDate) {
            if (!Date.compareDates(this._comicCollection.currentDate, this._comicCollection.latestDate)) {
                this.notLatestDateEvent.notify();
            }
        }
    }

    navigatingFrom () {
        super.navigatingFrom();
        this.$retrieveButton.off('click', this.retrieveComicsButtonHandler);
    }

    generateDateString () {
        if (Utilities.exists(this._comicCollection.currentDate)) {
            return 'Releases for ' + this._comicCollection.currentDate.toLocaleDateString("en-US");
        }
    }

    readyToRestore () {
        return Date.compareDates(this._comicCollection.currentDate, this._comicCollection.latestDate);
    }

    shouldCreateList () {
        return Date.compareDates(this._comicCollection.currentDate, this._comicCollection.latestDate);
    }
}

exports = module.exports = ReleasesView;
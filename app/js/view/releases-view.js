const { ComicListView } = require('./comic-list-view');
const Event = require('../misc/event-dispatcher');
// noinspection JSUnusedLocalSymbols
const logger = require("../misc/logger");
const Utilities = require("../misc/utilities");

// TODO Implement click handler for cover art to allow viewing at a higher resolution
// TODO Implemented variant cover browser

class ReleasesView extends ComicListView {
    constructor (comicCollection, storageInterface, alertService) {
        super(comicCollection, storageInterface, alertService);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'ReleasesView';
        this.retrieveActive = true;
        this.processedComics = 0;

        this.notLatestDateEvent = new Event(this);
        this.retrieveComicsEvent = new Event(this);
    }

    createChildren () {
        super.createChildren();
        this.$retrieveButton = $('a#comic-list-refresh-button');
        this.$retrieveStatusContainer = $('div#comic-retrieve-status-container');
        this.$retrieveStatusMessage = $('span#comic-retrieve-message');
        this.$progressBarContainer = $('div#progress-bar');
    }

    setupHandlers () {
        super.setupHandlers();
        this.retrieveComicsButtonHandler = this.retrieveComicsButton.bind(this);
        this.comicsStoredHandler = this.comicsStored.bind(this);
    }

    enable () {
        super.enable();

        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);
        this._comicCollection.comicsStoredEvent.attach(this.comicsStoredHandler);
    }

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

    comicsStable (sender, args) {
        super.comicsStable(sender, args);
        this.$retrieveButton.removeClass('disabled');
    }

    comicsUnstable (sender, args) {
        super.comicsUnstable(sender, args);
        this.$retrieveButton.addClass('disabled');
    }

    // TODO Make sure that other views can't disrupt the comic retrieval process...
    retrieveComicsButton (event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.$retrieveStatusContainer.removeClass('status-hidden');
            this.$retrieveStatusMessage.text('Retrieving comic list');
            this.disconnectComics();
            this.retrieveComicsEvent.notify();
            this.comicsUnstable();
            this.$comicList.addClass('disabled');
        }
    }

    retrievedComics (sender, args) {
        super.retrievedComics(sender, args);

        if (!Date.compareDates(this._comicCollection.currentDate, this._comicCollection.latestDate)) {
            this.notLatestDateEvent.notify();
        }        
        else if (this.state.saved && this.readyToRestore()) {
            this.state.restore(this);
        }
    }

    comicListProcessed (sender, numComics) {
        super.comicListProcessed(sender, numComics);

        this.processedComics = 0;
        this.$retrieveStatusMessage.text('Comic list retrieved');
    }

    comicProcessed (sender, comic) {
        super.comicProcessed(sender, comic);

        this.processedComics++;
        this.$retrieveStatusMessage.text(comic.title);

        if (this.processedComics === this.numComics) {
            this.$retrieveStatusMessage.text('Storing comics');
        }
        else {
            let percentComplete = (this.processedComics / this.numComics) * 100;
            this.$progressBarContainer[0].style.width = percentComplete.toString() + '%';
        }
    }

    // noinspection JSUnusedLocalSymbols
    comicsStored(sender, count) {
        this.$retrieveStatusContainer.addClass('status-hidden');
        this.$progressBarContainer[0].style.width = '0%';
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
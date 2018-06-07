const { ComicListView } = require('./comic-list-view');
const Event = require('../misc/event-dispatcher');

class ReleasesView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'ReleasesView';
        this.retrieveActive = true;

        this.retrieveComicsEvent = new Event(this);
    }

    createChildren () {
        super.createChildren();
        this.$retrieveButton = $('a#comic-list-refresh-button');
    }

    setupHandlers () {
        super.setupHandlers();
        this.retrieveComicsButtonHandler = this.retrieveComicsButton.bind(this);
    }

    enable () {
        super.enable();
        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);
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
        this.$retrieveButton.addClass('disabled')
    }

    retrieveComicsButton(event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.disconnectComics();
            this.retrieveComicsEvent.notify();
            this.comicsUnstable();
            this.$comicList.addClass('disabled');
        }
    }

    generateDateString () {
        return 'Releases for ' + this._comicCollection.latestDate.toLocaleDateString("en-US");
    }
}

exports = module.exports = ReleasesView;
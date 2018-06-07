const $ = require('jquery');
const { ComicListView } = require('./comic-list-view');

class ReleasesView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'ReleasesView';
    }

    createChildren () {
        super.createChildren();
        this.$retrieveButton = $('a#comic-list-refresh-button');
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

    generateDateString () {
        return 'Releases for ' + this._comicCollection.latestDate.toLocaleDateString("en-US");
    }
}

exports = module.exports = ReleasesView;
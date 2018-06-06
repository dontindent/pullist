const $ = require('jquery');
const ComicListView = require('./comic-list-view');

class PulledView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'PulledView';
    }

    createChildren () {
        super.createChildren();
    }

    enable () {
        super.enable();
    }

    navigatingFrom () {
        super.navigatingFrom();
    }

    comicsStable (sender, args) {
        super.comicsStable(sender, args);
    }

    comicsUnstable (sender, args) {
        super.comicsUnstable(sender, args);
    }

    generateDateString () {
        return 'Pull list for ' + this._comicCollection.latestDate.toLocaleDateString("en-US");
    }
}

exports = module.exports = PulledView;
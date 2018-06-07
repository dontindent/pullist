const logger = require("../misc/logger");
const { ComicListView, findComicElement } = require('./comic-list-view');
const { Alert } = require('./alert');

class PulledView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'PulledView';
        this.navigatedFrom = false;
    }

    createChildren () {
        super.createChildren();
    }

    enable () {
        super.enable();
    }

    navigatedTo() {
        super.navigatedTo();

        this.navigatedFrom = false;
    }

    navigatingFrom () {
        super.navigatingFrom();

        this.navigatedFrom = true;
    }

    comicPullButton (event) {
        let comic = event.data.comic;
        let superComicPullButton = super.comicPullButton.bind(this);

        if (comic.pulled === true) {
            this.confirmUnPull(comic, event, superComicPullButton);
        }
    }

    comicsStable (sender, args) {
        super.comicsStable(sender, args);
    }

    comicsUnstable (sender, args) {
        super.comicsUnstable(sender, args);
    }

    modelComicPulled(sender, args) {
        super.modelComicPulled(sender, args);

        if (!this.navigatedFrom) this.createList(this._comicCollection.comicsByPublisher);
    }

    unPullSelectedModelComic (event) {
        let comic = this._selectedComicElement.comic;
        let superUnPull = super.unPullSelectedModelComic.bind(this);

        this.confirmUnPull(comic, event, superUnPull);
    };

    confirmUnPull (comic, event, funIfTrue) {
        let title = 'Unpull comic?';
        let message = 'Are you sure you want to remove ' + comic.title + ' from your pull list?';

        Alert.confirm(title, message, function (result) {
            if (result) funIfTrue(event);
            else event.preventDefault();
        });
    }

    generateDateString () {
        return 'Pull list for ' + this._comicCollection.latestDate.toLocaleDateString("en-US");
    }

    defaultComicListFilter (comic) {
        return super.defaultComicListFilter(comic) && comic.pulled;
    }
}

exports = module.exports = PulledView;
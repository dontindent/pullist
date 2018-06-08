const logger = require("../misc/logger");
const { ComicListView, findComicElement } = require('./comic-list-view');
const { Alert } = require('./alert');

class PulledView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols
        this.callerString = 'PulledView';
        this.navigatedFrom = false;
        this.listPrice = 0.0;
        this.listCount = 0;
    }

    createChildren () {
        super.createChildren();

        this.$listPrice = $('span#comic-pulled-info-price');
        this.$listCount = $('span#comic-pulled-info-count');
    }

    enable () {
        super.enable();
    }

    navigatedTo() {
        super.navigatedTo();
        this.assessPullList();

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

        this.createList(this._comicCollection.comicsByPublisher);
        this.assessPullList();
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

    assessPullList () {
        this.listPrice = 0;
        this.listCount = 0;

        for (let comicKey in this._comicCollection.comicDict) {
            if (!this._comicCollection.comicDict.hasOwnProperty(comicKey)) continue;

            let comic = this._comicCollection.comicDict[comicKey];

            if (this.defaultComicListFilter(comic)) {
                this.listPrice += comic.price;
                this.listCount++;
            }
        }

        this.$listPrice.text(this.listPrice.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        }));

        let countString = this.listCount !== 1 ? this.listCount + ' comics in list' : this.listCount + ' comic in list';

        this.$listCount.text(countString);
    }
}

exports = module.exports = PulledView;
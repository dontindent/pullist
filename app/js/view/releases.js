const $ = require('jquery');
const Event = require('../misc/event-dispatcher');

let selectedComic = null;

class ReleasesView {
    constructor (comicCollection) {
        this._comicCollection = comicCollection;
        this._selectedComic = null;
        this.numComics = 0;
        this.retrieveActive = true;

        this.retrieveComicsEvent = new Event(this);
    }

    init() {
        this.createChildren();
        this.setupHandlers();
        this.enable();

        this._initialized = true;
    }

    createChildren() {
        this.$retrieveButton = $('a.comic-list-refresh-button');
        this.$releasesDate = $('#comic-list-header h1');

        return this;
    }

    setupHandlers() {
        this.retrieveComicsButtonHandler = this.retrieveComicsButton.bind(this);

        this.retrievedComicsHandler = this.retrievedComics.bind(this);
        this.comicListProcessedHandler = this.comicListProcessed.bind(this);
        this.comicProcessedHandler = this.comicProcessed.bind(this);
        this.comicsStableHandler = this.comicsStable.bind(this);

        return this;
    }

    enable() {
        this.$retrieveButton.on('click', this.retrieveComicsButtonHandler);

        this._comicCollection.retrievedComicsEvent.attach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.attach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.attach(this.comicProcessedHandler);
        this._comicCollection.comicsStableEvent.attach(this.comicsStableHandler);

        return true;
    }

    retrieveComicsButton(event) {
        event.preventDefault();

        if (this.retrieveActive) {
            this.retrieveComicsEvent.notify();
            this.retrieveActive = false;
            this.$retrieveButton.toggleClass('disabled');
        }
    }

    retrievedComics() {
        this.createList(this._comicCollection.comicsByPublisher);
        if (this._comicCollection.latestDate) {
            this.$releasesDate.text('Releases for ' + this._comicCollection.latestDate.toLocaleDateString("en-US"));
        }
    }

    navigatedTo() {
        this.init();
        if (this._initialized) {
            this.retrievedComics();
        }
    }

    navigatingFrom() {
        this.$retrieveButton.off('click', this.retrieveComicsButtonHandler);

        this._comicCollection.retrievedComicsEvent.unattach(this.retrievedComicsHandler);
        this._comicCollection.comicListProcessedEvent.unattach(this.comicListProcessedHandler);
        this._comicCollection.comicProcessedEvent.unattach(this.comicProcessedHandler);
        this._comicCollection.comicsStableEvent.unattach(this.comicsStableHandler);
    }

    comicListProcessed (sender, args) {
        this.numComics = args;
    }

    comicProcessed (sender, args) {

    }

    comicsStable (sender, args) {
        this.retrieveActive = true;
        this.$retrieveButton.toggleClass('disabled');
    }

    createList(comicList) {
        let $comicList = $('#comic-list');
        let $publisherTemplate = $($('#publisher-template').prop('content')).find('.publisher-group');
        let $comicListTemplate = $($('#comic-list-template').prop('content')).find('.list-comic');

        selectedComic = this._selectedComic;

        $comicList.empty();

        for(let key in comicList) {
            if (!comicList.hasOwnProperty(key)) continue;

            let $publisherTemplateClone = $publisherTemplate.clone();
            $($publisherTemplateClone).find('.publisher-heading').text(key);

            let $publisherComics = $($publisherTemplateClone).find('.publisher-list');

            comicList[key].forEach(function(comic) {
                let $comicListTemplateClone = $comicListTemplate.clone();
                $($comicListTemplateClone).find('.comic-title-list').text(comic.title);
                $($comicListTemplateClone).find('.comic-writer-list').text(comic.writer);
                $($comicListTemplateClone).find('.comic-artist-list').text(comic.artist);

                $comicListTemplateClone[0].comic = comic;

                $comicListTemplateClone.on('click', function(event) {
                    let oldSelectedComic = selectedComic;
                    selectedComic = this;

                    if(oldSelectedComic) $(oldSelectedComic).toggleClass('selected-comic');
                    $(selectedComic).toggleClass('selected-comic');

                    event.preventDefault();
                });

                $comicListTemplateClone.appendTo($publisherComics);
            });

            $publisherTemplateClone.appendTo($comicList);
        }
    }
}

exports = module.exports = ReleasesView;
const Injector = require('../misc/injector');

class ComicController {
    constructor (model, view) {
        this._model = model;
        this._view = view;

        this.init();
    }

    init () {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers () {
        this.retrieveComicsHandler = this.retrieveComics.bind(this);
        return this;
    }

    enable () {
        this._view.retrieveComicsEvent.attach(this.retrieveComicsHandler);
    }

    retrieveComics() {
        this._model.populateComics();
    }
}

exports = module.exports = ComicController;
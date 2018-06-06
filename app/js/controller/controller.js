class Controller {
    constructor (model, view) {
        this._model = model;
        this._view = view;

        this.init();
    }

    init() {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers() {

    }

    enable() {

    }

    retrieveComics() {

    }
}

exports = module.exports = Controller;
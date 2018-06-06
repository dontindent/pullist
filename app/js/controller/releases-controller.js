const Controller = require('./controller');

class ReleasesController extends Controller {
    constructor (model, view) {
        super(model, view);
    }

    setupHandlers() {
        super.setupHandlers();
        this.retrieveComicsHandler = this.retrieveComics.bind(this);
    }

    enable() {
        super.enable();
        this._view.retrieveComicsEvent.attach(this.retrieveComicsHandler);
    }

    retrieveComics() {
        this._model.populateComics();
    }
}

exports = module.exports = ReleasesController;
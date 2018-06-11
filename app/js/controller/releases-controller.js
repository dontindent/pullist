const Controller = require('./controller');
const { Rule, RuleGroup } = require('../model/main-window/rule');

class ReleasesController extends Controller {
    constructor (comicCollection, releasesView, ruleCollection) {
        super(comicCollection, releasesView);

        this.ruleCollection = ruleCollection;
    }

    setupHandlers () {
        super.setupHandlers();
        this.retrieveComicsHandler = this.retrieveComics.bind(this);
        this.refreshedListHandler = this.refreshedList.bind(this);
    }

    enable () {
        super.enable();
        this._view.retrieveComicsEvent.attach(this.retrieveComicsHandler);
        this._view.refreshedListEvent.attach(this.refreshedListHandler);
    }

    // noinspection JSUnusedLocalSymbols
    retrieveComics (sender, args) {
        this.retrieveStarted = true;
        this._model.populateComics();
    }

    // noinspection JSUnusedLocalSymbols
    refreshedList (sender, args) {
        if (!this.retrieveStarted) return;

        this.retrieveStarted = false;

        for (let key in this._model.comicDict) {
            if (!this._model.comicDict.hasOwnProperty(key)) continue;

            this.ruleCollection.rootRule.apply(this._model.comicDict[key]);
        }
    }
}

exports = module.exports = ReleasesController;
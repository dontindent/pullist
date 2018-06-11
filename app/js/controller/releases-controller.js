//@ts-check

const Controller = require('./controller');
const { Rule, RuleGroup } = require('../model/main-window/rule');
const logger = require('../misc/logger');

class ReleasesController extends Controller {
    constructor (comicCollection, releasesView, ruleCollection) {
        super(comicCollection, releasesView);

        this.callerString = 'ReleasesController';
        this.ruleCollection = ruleCollection;
    }

    setupHandlers () {
        super.setupHandlers();

        this.notLatestDateHandler = this.onNotLatestDate.bind(this);
        this.retrieveComicsHandler = this.retrieveComics.bind(this);
        this.refreshedListHandler = this.refreshedList.bind(this);
    }

    enable () {
        super.enable();
        
        this._view.notLatestDateEvent.attach(this.notLatestDateHandler);
        this._view.retrieveComicsEvent.attach(this.retrieveComicsHandler);
        this._view.refreshedListEvent.attach(this.refreshedListHandler);
    }

    onNavigatedTo (sender, args) {
        super.onNavigatedTo();
    }

    onNotLatestDate (sender, args) {
        this._model.loadComicsForDate(this._model.latestDate);
        logger.log('Requesting the comics for latest release date', this.callerString);
    }

    // noinspection JSUnusedLocalSymbols
    retrieveComics (sender, args) {
        this.retrieveStarted = true;
        this._model.populateComics();
    }
    
    /** Function to be executed after a retrieve comics command has finished in the view
     * 
     * @param  {Object} sender - The object which triggeredt the event
     * @param  {*} args - The arguments that were passed when the event was triggered
     */

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

//@ts-ignore
exports = module.exports = ReleasesController;
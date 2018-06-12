const Comic = require('../model/main-window/comic');

class Controller {
    constructor (model, view) {
        this._model = model;
        this._view = view;
        this.isActive = false;

        this.init();
    }

    init () {
        this.setupHandlers();
        this.enable();
    }

    setupHandlers () {
        this.navigatedToHandler = this.onNavigatedTo.bind(this);
        this.nnedLastComicPulledHandler = this.onNeedLastComicPulled.bind(this);
    }

    enable () {
        this._view.navigatedToEvent.attach(this.navigatedToHandler);

        if ('needLastComicPulledEvent' in this._view) {
            this._view.needLastComicPulledEvent.attach(this.nnedLastComicPulledHandler);
        }
    }

    // eslint-disable-next-line no-unused-vars
    onNavigatedTo (sender, args) {

    }

    onNeedLastComicPulled(sender, args) {
        let comic = typeof args === typeof new Comic() ? args : null;

        comic.loadLastIssueData();
    }
}

//@ts-ignore
exports = module.exports = Controller;
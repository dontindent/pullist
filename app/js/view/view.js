let Event = require('../misc/event-dispatcher');

class View {
    constructor () {
        this._readytoView = false;
        this.readyToViewEvent = new Event (this);
    }

    init() {
        this.createChildren();
        this.setupHandlers();
        this.enable();
    }

    createChildren () {

    }

    setupHandlers () {

    }

    enable () {

    }

    navigatedTo () {
        this.init();
    }

    navigatingFrom () {

    }

    get readyToView () {
        return this._readytoView;
    }

    set readyToView (value) {
        this._readytoView = value;
        this.readyToViewEvent.notify();
    }
}

exports = module.exports = View;
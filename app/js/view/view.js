let Event = require('../misc/event-dispatcher');
let logger = require('../misc/logger');

class View {
    constructor () {
        this.callerString = 'View';
        this._readytoView = false;
        this.readyToViewEvent = new Event (this);
        this.navigatedToEvent = new Event (this);
        this.navigatingFromEvent = new Event(this);
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
        logger.log('Navigated to, starting initialization', this.callerString);
        this.init();

        this.navigatedToEvent.notify();
    }

    navigatingFrom () {
        logger.log('Navigating from', this.callerString);

        this.navigatingFromEvent.notify();
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
let Event = require('../misc/event-dispatcher');

class View {
    constructor () {
        this._readytoView = false;
        this.readyToViewEvent = new Event (this);
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
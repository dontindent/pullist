class Event {
    constructor (sender) {
        this._sender = sender;
        this._listeners = [];
    }

    attach (listener) {
        this._listeners.push(listener);
    }

    notify (args) {
        let sender = this._sender;
        this._listeners.forEach(function(listener) {
            listener(sender, args);
        })
    }

    reset() {
        this._listeners.length = 0;
    }
}

exports = module.exports = Event;
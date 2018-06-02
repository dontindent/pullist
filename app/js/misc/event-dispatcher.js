class Event {
    constructor (sender) {
        this._sender = sender;
        this._listeners = [];
    }

    attach (listener) {
        if (this._listeners.indexOf(listener) === -1) {
            this._listeners.push(listener);
        }
    }

    unattach (listener) {
        let index = this._listeners.indexOf(listener);

        if (index !== -1) {
            this._listeners.splice(index, 1);
        }
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
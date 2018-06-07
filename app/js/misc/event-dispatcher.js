class Event {
    constructor (sender, postFire = false) {
        this._sender = sender;
        this._listeners = [];
        this._postFire = postFire;
        this._postFireArgs = null;
        this.fired = false;
    }

    attach (listener) {
        if (this._listeners.indexOf(listener) === -1) {
            this._listeners.push(listener);
        }

        if (this._postFire && this.fired) {
            this.notify(this._postFireArgs, { listener: listener });
        }
    }

    unattach (listener) {
        let index = this._listeners.indexOf(listener);

        if (index !== -1) {
            this._listeners.splice(index, 1);
        }
    }

    notify (args, opts = {}) {
        let sender = this._sender;

        if (opts['listener']) {
            let listener = opts['listener'];
            listener(sender, args);
        }
        else {
            this._listeners.forEach(function(listener) {
                listener(sender, args);
            });
        }

        this.fired = true;

        if (this._postFire) {
            this._postFireArgs = args;
        }
    }

    reset() {
        this._listeners.length = 0;
    }
}

exports = module.exports = Event;
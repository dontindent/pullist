/** Basic event class for sharing notifcations between objects
 * 
 */
class Event {
    constructor (sender, postFire = false) {
        /** @private */
        this._sender = sender;
        /** @private */
        this._listeners = [];
        /** @private */
        this._postFire = postFire;
        /** @private */
        this._postFireArgs = null;
        /**
         * @member {boolean} fired
         */
        this.fired = false;
    }

    /** Attaches a callback to the event.
     * If {@link event#fired} is set, attaching after the event has fired will trigger an immediate notify.
     * @param {Function} listener - The callback to be called once {@link event#notify} is called
     */
    attach (listener) {
        if (this._listeners.indexOf(listener) === -1) {
            this._listeners.push(listener);
        }

        if (this._postFire && this.fired) {
            this.notify(this._postFireArgs, { listener: listener });
        }
    }

    /** Removes a callback from the event.
     * @param {Function} listener - The callback to be removed
     */
    unattach (listener) {
        let index = this._listeners.indexOf(listener);

        if (index !== -1) {
            this._listeners.splice(index, 1);
        }
    }

    /** Notifies all listeners that the event fired.
     * 
     * @param {*} args - The arguments that will be passed to the listeners
     * @param {Object} opts - The potential options for the notification
     * @param {Function} opts.listener - Specifies a specific listener to notify, instead of all listeners
     */
    notify (args, opts = {}) {
        let sender = this._sender;

        if (this._postFire) this._postFireArgs = args;

        if (this.fired) {
            args = [ { fired: true }, args ];
        }

        if (opts.listener) {
            let listener = opts.listener;
            listener(sender, args);
        }
        else {
            this._listeners.forEach(function(listener) {
                listener(sender, args);
            });
        }

        this.fired = true;
    }

    /** Resets the entire event object, including removing all listeners */
    reset () {
        this._listeners.length = 0;
        this.fired = false;
    }

    /** Clears the event fired property, to allow for a new notification */
    clear () {
        this.fired = false;
    }
}

exports = module.exports = Event;
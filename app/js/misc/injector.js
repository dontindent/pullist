class Injector {
    constructor () {
        this._registry = {};
    }

    register (serviceType, service) {
        this._registry[serviceType] = new service();
    }

    resolve (serviceType) {
        if (serviceType in this._registry) {
            return this._registry[serviceType];
        }
        else {
            throw new Error('Can\'t resolve ' + serviceType);
        }
    }
}

exports = module.exports = new Injector();
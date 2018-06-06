class Injector {
    constructor () {
        this._registry = {};
        this._dependencies = {};
        this._instances = {};
    }

    register (serviceType, service, dependencies = []) {
        if (serviceType in this._registry) return;

        this._registry[serviceType] = service;
        this._dependencies[serviceType] = dependencies;
    }

    resolve (serviceType) {
        if (!(serviceType in this._instances)) {
            let dependencyList = [];

            if (serviceType in this._registry) {
                if (serviceType in this._dependencies) {
                    let injector = this;

                    this._dependencies[serviceType].forEach(function (dependency) {
                        dependencyList.push(injector.resolve(dependency));
                    });
                }

                this._instances[serviceType] = new this._registry[serviceType](...dependencyList);
            }
            else {
                throw new Error('Can\'t resolve ' + serviceType);
            }
        }

        return this._instances[serviceType];
    }
}

exports = module.exports = new Injector();
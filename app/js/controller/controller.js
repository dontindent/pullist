//@ts-check

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
    }

    enable () {
        this._view.navigatedToEvent.attach(this.navigatedToHandler);
    }

    onNavigatedTo (sender, args) {

    }
}

//@ts-ignore
exports = module.exports = Controller;
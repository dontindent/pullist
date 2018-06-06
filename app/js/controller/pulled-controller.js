const Controller = require('./controller');

class PulledController extends Controller {
    constructor (model, view) {
        super(model, view);
    }

    setupHandlers() {
        super.setupHandlers();
    }

    enable() {
        super.enable();
    }
}

exports = module.exports = PulledController;
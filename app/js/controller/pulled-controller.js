const Controller = require('./controller');

class PulledController extends Controller {
    constructor (model, view) {
        super(model, view);
    }

    setupHandlers () {
        super.setupHandlers();

        this.viewSelectedDateChangedHandler = this.viewSelectedDateChanged.bind(this);
    }

    enable () {
        super.enable();

        this._view.selectedDateChangedEvent.attach(this.viewSelectedDateChangedHandler);
    }

    viewSelectedDateChanged (sender, date) {
        this._model.loadComicsForDate(date);
    }
}

exports = module.exports = PulledController;
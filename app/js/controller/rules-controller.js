const Controller = require('./controller');

// Included for documentation
const RuleCollection = require('../model/main-window/rule-collection');     /* eslint-disable-line no-unused-vars */
const RulesView = require('../view/rules-view');                            /* eslint-disable-line no-unused-vars */

/**
 * @extends {Controller}
 */
class RulesController extends Controller {
    /**
     * 
     * @param {RuleCollection} model 
     * @param {RulesView} view 
     */
    constructor (model, view) {
        super(model, view);

        /** @type {RuleCollection} */
        this._model;
        /** @type {RulesView} */
        this._view;
    }

    setupHandlers () {
        super.setupHandlers();

        this._addButtonClickedHandler = this._onAddButtonClicked.bind(this);
        this._convertButtonClickedHandler = this._onConvertButtonClicked.bind(this);
        this._deleteButtonClickedHandler = this._onDeleteButtonClicked.bind(this);
    }

    enable () {
        super.enable();

        this._view.ruleAddedEvent.attach(this._addButtonClickedHandler);
        this._view.ruleConvertedEvent.attach(this._convertButtonClickedHandler);
        this._view.ruleDeletedEvent.attach(this._deleteButtonClickedHandler);
    }

    // #region Handlers

    _onAddButtonClicked (sender, args) {
        let ruleGroup = args.ruleGroup;
    }

    _onConvertButtonClicked (sender, args) {

    }
    
    _onDeleteButtonClicked (sender, args) {

    }

    // #endregion
}

exports = module.exports = RulesController;
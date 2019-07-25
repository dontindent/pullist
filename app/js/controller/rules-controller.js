const Controller = require('./controller');
const { Rule, RuleGroup } = require('../model/main-window/rule');

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
        /** @type {RuleGroup} */
        let ruleGroup = args.ruleGroup;

        this._model.addNewRuleToGroup(ruleGroup);

        console.log(ruleGroup);
    }

    _onConvertButtonClicked (sender, args) {
        let ruleGroup = args.ruleGroup;
    }
    
    _onDeleteButtonClicked (sender, args) {
        let ruleGroup = args.ruleGroup;
        
        if ('rule' in args) {
            let rule = args.ruie;    
        }
        else {
            let result = findRuleObject(this._model.rootRule, ruleGroup);
            
            if (result !== null) {
                result.parent.rules.splice(result.index, 1);
            }
        }

    }

    // #endregion
}

/**
 * 
 * @param {RuleGroup} root
 * @param {Rule|RuleGroup} ruleObj
 * 
 * @returns {{parent: RuleGroup, index: number}} Parent element and the index of the rule
 */
function findRuleObject (root, ruleObj) {
    let index = 0;
    for (let rule of root.rules) {
        if (rule === ruleObj) {
            return {parent: root, index: index}
        }

        if (rule instanceof RuleGroup) {
            let result = findRuleObject (rule, ruleObj);
            if (result !== null) return result;
        }

        index++;
    }

    return null;
}

exports = module.exports = RulesController;
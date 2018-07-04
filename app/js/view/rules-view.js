const View = require('./view');

const { remote, ipcRenderer } = require('electron');
const logger = require('../misc/logger');
const { Rule, RuleGroup, RuleOperator } = require('../model/main-window/rule');
const Event = require('../misc/event-dispatcher');
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class RuleContainer {
    /**
     * 
     * @param {RulesView} view 
     * @param {*} alertService 
     */
    constructor (view, alertService) {
        /** @type {RulesView} */
        this.view = view;
        this.alertService = alertService;

        this.$detailTitle = $('div#details-content h1');
        this.$watchButton = $('button#watch-button');
        this.$unWatchButton = $('button#un-watch-button');
        this.$pullButton = $('button#pull-button');
        this.$unPullButton = $('button#un-pull-button');
        this.$ruleBreakdownContainer = $('div#rule-breakdown-container');
    }

    select (selectedRuleElement) {
        let rule = selectedRuleElement.rule;

        $(selectedRuleElement).addClass('selected-element');

        this.update(rule);
    }

    update (rule, handlers = true) {
        if (handlers) {
            // this.$watchButton.on('')
        }        

        this.$detailTitle.text(rule.name);

        this.$ruleBreakdownContainer.empty();
        createRuleGroupDetailElement (rule, this.$ruleBreakdownContainer, this.view);
    }

    unSelect (selectedRuleElement, refresh = false) {
        if (!refresh) $(selectedRuleElement).removeClass('selected-element');
    }
}

class RulesView extends View  {
    /**
     * 
     * @param {RuleCollection} ruleCollection 
     */
    constructor (ruleCollection) {
        super();

        this.callerString = 'RulesView';
    
        /**
            The collection of rules associated with this view

            @name RulesView#ruleCollection
            @type {RuleCollection}
        */
        this.ruleCollection = ruleCollection;
        this._alertService = null;

        this.ruleAddedEvent = new Event(this);
        this.ruleDeletedEvent = new Event(this);
        this.ruleConvertedEvent = new Event(this);
    }

    // #region Setup

    createChildren() {
        super.createChildren();

        this.$ruleDetailsNone = $('div#rule-details-none');
        this.$ruleList = $('div.list-container');

        return this;
    }

    setupHandlers() {
        super.setupHandlers();

        this._rulesLoadedEventHandler = this._onRulesLoadedEvent.bind(this);
        this._ruleElementSelectedHandler = this._onRuleElementSelected.bind(this);

        return this;
    }

    enable() {
        super.enable();

        this.ruleCollection.rulesLoadedEvent.attach(this._rulesLoadedEventHandler);

        return this;
    }

    // #endregion

    // #region Handlers
    
    _onRuleAdded (sender, args) {
        // if (sender)
    }

    _onRuleElementSelected (event) {
        event.preventDefault();

        let oldSelectedRuleElement = this._selectedRuleElement;
        let oldSelectedRuleContainer = this._selectedRuleContainer;

        this._selectedRuleElement = event.delegateTarget;
        this._selectedRuleContainer = new RuleContainer(this, this._alertService);

        if (oldSelectedRuleContainer) {
            oldSelectedRuleContainer.unSelect(oldSelectedRuleElement);
        }

        this._selectedRuleContainer.select(this._selectedRuleElement);
        
        let rule = this._selectedRuleElement.rule;

        logger.log(['New element selected for:', rule.name], this.callerString);

        this.$ruleDetailsNone.hide();
    }

    _onRulesLoadedEvent (sender, args) {
        if (args && args[0].fired) {
            this.createList(args[1]);
        }
        else {
            this.createList(args);
        }
    }

    // #endregion

    navigatedTo () {
        super.navigatedTo();

        // console.log(this.ruleCollection.data);
    }

    navigatingFrom () {
        super.navigatingFrom();
    }

    /**
     * 
     * @param {RuleGroup} rootRule 
     */
    createList (rootRule) {
        if (!this.shouldCreateList()) return;

        let view = this;
        let elementCount = 0;
        let $ruleList = $('div.list-container');
        let $ruleListTemplate = $($('#rule-list-template').prop('content'))
            .find('.list-element');

        $ruleList.empty();

        for (var rule of rootRule.rules) {
            let $ruleListTemplateClone = $ruleListTemplate.clone();

            let ruleCount = this.createRuleElement(
                view, 
                rule, 
                $ruleListTemplateClone,
                $ruleList
            );

            elementCount += ruleCount;
        }

        logger.log(['Created', elementCount, 'rule elements for list'],
            this.callerString);
        // this.refreshedListEvent.notify(null);
    }

    createRuleElement (view, rule, $ruleListTemplateClone, $ruleList) {
        // let $pullButton = $($ruleListTemplateClone).find('.comic-list-button');

        $($ruleListTemplateClone).find('.element-title-list').text(rule.name);
        $($ruleListTemplateClone).find('.rule-description-list').text(rule.toString());

        $ruleListTemplateClone[0].rule = rule;

        $ruleListTemplateClone.on('click', view._ruleElementSelectedHandler);

        $ruleListTemplateClone.appendTo($ruleList);

        return 1;
    }
    
    shouldCreateList () {
        return true;
    }
}

/**
 * 
 * @param {RuleGroup} ruleGroup 
 * @param {JQuery<HTMLElement>} $parent 
 * @param {RulesView} view 
 */
function createRuleGroupDetailElement (ruleGroup, $parent, view) {
    let $groupTemplate = $($('#rule-group-template').prop('content'))
        .find('.group-container');
    $groupTemplate = $groupTemplate.clone();

    let $groupTypeSelector = $($groupTemplate).find('select.group-type-selector'); 

    let $groupRules = $($groupTemplate).find('.group-rules');
    let $deleteButton = $($groupTemplate).find('button.delete-rule');
    let $addButton = $($groupTemplate).find('button.add-rule');

    $groupTypeSelector.val(ruleGroup.groupType);

    $groupTypeSelector.on('change', () => {
        ruleGroup.groupType = $groupTypeSelector.val();
    });

    $deleteButton.on('click', () => view.ruleDeletedEvent.notify({
        ruleGroup: ruleGroup
    }));
    $addButton.on('click', () => view.ruleAddedEvent.notify({
        ruleGroup: ruleGroup
    }));

    for (let childRule of ruleGroup.rules) {
        if (childRule instanceof RuleGroup) {
            createRuleGroupDetailElement(childRule, $groupRules, view);
        }
        else if (childRule instanceof Rule) {
            createRuleDetailElement(childRule, ruleGroup, $groupRules, view);
        }
    }

    $groupTemplate.appendTo($parent);
}

/**
 * 
 * @param {Rule} rule  
 * @param {JQuery<HTMLElement>} $parent 
 * @param {RulesView} view 
 */
function createRuleDetailElement (rule, ruleGroup, $parent, view) {
    let $ruleTemplate = $($('#rule-line-template').prop('content'))
        .find('.rule-div');
    $ruleTemplate = $ruleTemplate.clone();

    let $propertySelector = $($ruleTemplate).find('select.rule-property-selector');
    let $operatorSelector = $($ruleTemplate).find('select.rule-operator-selector');
    let $valueInput = $($ruleTemplate).find('input.rule-value');

    let $deleteButton = $($ruleTemplate).find('button.delete-rule');
    let $convertButton = $($ruleTemplate).find('button.convert-rule');

    $propertySelector.val(rule.targetProperty);
    $operatorSelector.val(RuleOperator.toString(rule.operator));
    $valueInput.val(rule.targetValue);

    $propertySelector.on('change', () => {
        rule.targetProperty = $propertySelector.val();
    });

    $operatorSelector.on('change', () => {
        rule.operator = RuleOperator.fromString($operatorSelector.val());
    });

    $valueInput.on('change', () => {
        rule.targetValue = $valueInput.val();
    });

    $deleteButton.on('click', () => view.ruleDeletedEvent.notify({
        rule: rule,
        ruleGroup: ruleGroup
    }));
    $convertButton.on('click', () => view.ruleConvertedEvent.notify({
        rule: rule,
        ruleGroup: ruleGroup
    }));

    $ruleTemplate.appendTo($parent);
}

exports = module.exports = RulesView;
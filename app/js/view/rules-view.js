const View = require('./view');

const { remote, ipcRenderer, shell } = require('electron');
const userPrefs = remote.getGlobal('userPrefs');
const logger = require('../misc/logger');
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class RulesView extends View  {
    /**
     * 
     * @param {RuleCollection} ruleCollection 
     */
    constructor (ruleCollection) {
        super();
    
        /**
            The collection of rules associated with this view

            @name RulesView#ruleCollection
            @type {RuleCollection}
        */
        this.ruleCollection = ruleCollection;
    }

    // #region Setup

    createChildren() {
        super.createChildren();

        this.$ruleList = $('div.list-container');

        return this;
    }

    setupHandlers() {
        super.setupHandlers();

        this._rulesLoadedEventHandler = this._onRulesLoadedEvent.bind(this);

        return this;
    }

    enable() {
        super.enable();

        this.ruleCollection.rulesLoadedEvent.attach(this._rulesLoadedEventHandler);

        return this;
    }

    // #endregion

    // #region Handlers

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

        $ruleListTemplateClone.appendTo($ruleList);

        return 1;
    }
    
    shouldCreateList () {
        return true;
    }
}

exports = module.exports = RulesView;
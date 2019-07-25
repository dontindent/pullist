const electron = require('electron');
const path = require('path');
const fs = require('fs');

/* eslint-disable no-unused-vars */
const { 
    RuleGroupType,
    RuleResultType, 
    RuleOperator, 
    ObservableRuleArray, 
    Rule, 
    RuleGroup 
} = require('./rule');
/* eslint-enable no-unused-vars */
const Event = require('../../misc/event-dispatcher');

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const rulesFilePath = path.join(userDataPath, 'rules.json');

class RuleCollection {
    constructor () {
        this.rootRule = null;
        this.data = null;

        this.rulesLoadedEvent = new Event(this, true);

        this.loadRules();
    }

    loadRules () {
        let ruleCollection = this;

        fs.readFile(rulesFilePath, 'utf8', function (error, data) {
            if (error) throw error;
            rulesFileRead(ruleCollection, data);
        })
    }

    /**
     * 
     * @param {RuleGroup} ruleGroup 
     */
    addNewRuleToGroup (ruleGroup) {
        let rule = new Rule();
        
        rule.targetProperty = 'Artist';
        rule.operator = RuleOperator.contains;

        ruleGroup.rules.push(rule);
    }
}

/**
 * 
 * @param {RuleCollection} ruleCollection 
 * @param {string} data 
 */
function rulesFileRead (ruleCollection, data) {
    ruleCollection.rootRule = reconstructFromJSON(JSON.parse(data));

    ruleCollection.rulesLoadedEvent.notify(ruleCollection.rootRule);
}

function reconstructFromJSON (ruleObject) {
    if ('allowReprints' in ruleObject) {
        let ruleGroup = new RuleGroup();
        Object.assign(ruleGroup, ruleObject);

        let rules = ruleGroup.rules;
        let ruleGroupsTemp = [];
        let rulesTemp = [];
        ruleGroup.rules = new ObservableRuleArray();

        // The goal here is to float rule groups to the top of the list, then add the
        // inidividual rules
        for (let i = 0; i < rules.length; i++) {
            let ruleObjectTemp = reconstructFromJSON(rules[i]);

            if (ruleObjectTemp instanceof RuleGroup) {
                ruleGroupsTemp.push(ruleObjectTemp);
            }
            else if (ruleObjectTemp instanceof Rule) {
                rulesTemp.push(ruleObjectTemp);
            }
        }

        for (let ruleGroupTemp of ruleGroupsTemp) {
            ruleGroup.rules.push(ruleGroupTemp);
        }

        for (let ruleTemp of rulesTemp) {
            ruleGroup.rules.push(ruleTemp);
        }

        return ruleGroup;
    }
    else if ('targetProperty' in ruleObject) {
        let rule = new Rule();
        Object.assign(rule, ruleObject);

        // Very early in the morning, can't think, got method from:
        // https://joshtronic.com/2016/02/14/how-to-capitalize-the-first-letter-in-a-string-in-javascript/
        rule.targetProperty = rule.targetProperty.replace(/^\w/, c => c.toLowerCase());

        // rule.operator is going to be a string after being parsed from JSON
        // noinspection JSCheckFunctionSignatures
        rule.operator = RuleOperator.fromString(rule.operator);

        return rule;
    }

    return null;
}

exports = module.exports = RuleCollection;  
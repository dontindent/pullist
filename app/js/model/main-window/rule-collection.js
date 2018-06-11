const electron = require('electron');
const path = require('path');
const fs = require('fs');

const { RuleGroupType, RuleResultType, RuleOperators, Rule, RuleGroup } = require('./rule');

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const rulesFilePath = path.join(userDataPath, 'rules.json');

class RuleCollection {
    constructor () {
        this.rootRule = null;
        this.data = null;

        this.loadRules();
    }

    loadRules () {
        let ruleCollection = this;

        fs.readFile(rulesFilePath, function(error, data) {
            if (error) throw error;
            rulesFileRead(ruleCollection, data);
        })
    }
}

function rulesFileRead (ruleCollection, data) {
    ruleCollection.rootRule = reconstructFromJSON(JSON.parse(data));

    console.log(ruleCollection.rootRule);
}

function reconstructFromJSON (ruleObject) {
    if ('allowReprints' in ruleObject) {
        let ruleGroup = new RuleGroup();
        Object.assign(ruleGroup, ruleObject);

        for (let i = 0; i < ruleGroup.rules.length; i++) {
            ruleGroup.rules[i] = reconstructFromJSON(ruleGroup.rules[i]);
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
        rule.operator = RuleOperators.fromString(rule.operator);

        return rule;
    }

    return null;
}

exports = module.exports = RuleCollection;
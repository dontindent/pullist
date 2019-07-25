/* eslint-disable-next-line no-unused-vars */
const Comic = require('./comic');
const Event = require('../../misc/event-dispatcher');
require('../../misc/utilities');

/**
 * Enum for RuleGroup types
 * @readonly
 * @enum {number}
 */
const RuleGroupType = Object.freeze({
    any: 0,
    all: 1
});

/**
 * Enum for RuleGroup result types
 * @readonly
 * @enum {number}
 */
const RuleResultType = Object.freeze({
    none: 0,
    watch: 1,
    pull: 2
});


class RuleOperator {
    /** Evalues if two values match
     *
     * @param {(string|number)} value The value being assessed
     * @param {(string|number)} target The target value being assessed against
     * @returns {boolean} Whether value matches target
     */
    static is (value, target) {
        if (typeof value === typeof target === typeof 'string') {
            return value.toLowerCase() === target.toLowerCase();
        }
        else {
            return value === target;
        }
    }

    /** Evalues if two values do not match
     *
     * @param {(string|number)} value The value being assessed
     * @param {(string|number)} target The target value being assessed against
     * @returns {boolean} Whether value does not match target
     */
    static isNot (value, target) {
        if (typeof value === typeof target === typeof 'string') {
            return value.toLowerCase() !== target.toLowerCase();
        }
        else {
            return value !== target;
        }
    }

    /** Evaluates if a string contains another string
     *
     * @param {string} value The value being assessed
     * @param {string} target The target value being assessed against
     * @returns {boolean} Whether value contains target
     */
    static contains (value, target) {
        return value.toLowerCase().includes(target.toLowerCase());
    }

    /** Evaluates if a string does not contain another string
     *
     * @param {string} value The value being assessed
     * @param {string} target The target value being assessed against
     * @returns {boolean} Whether value does not contain target
     */
    static doesNotContain (value, target) {
        return !value.toLowerCase().includes(target.toLowerCase());
    }

    /** Evaluates if one value is less than another
     *
     * @param {number} value The value being assessed
     * @param {number} target The target value being assessed against
     * @returns {boolean} Whether value is less than target
     */
    static lessThan (value, target) {
        return value < target;
    }

    /** Evaluates if one value is greater than another
     *
     * @param {number} value The value being assessed
     * @param {number} target The target value being assessed against
     * @returns {boolean} Whether value is greater than target
     */
    static greaterThan (value, target) {
        return value > target;
    }

    /** Converts a string representation of a RuleOperator to a function
     *
     * @param {string} value The string being converted
     * @returns {*} The function represented by the string
     */
    static fromString (value) {
        switch (value.toLowerCase()) {
            case 'equal':
            case 'is':
                return RuleOperator.is;
            case 'notqeual':
            case 'isnot':
                return RuleOperator.isNot;
            case 'contains':
                return RuleOperator.contains;
            case 'notcontains':
            case 'doesnotcontain':
                return RuleOperator.doesNotContain;
            case "lessthan":
                return RuleOperator.lessThan;
            case 'greaterthan':
                return RuleOperator.greaterThan;
            default:
                return null;
        }
    }

    /** Converts a RuleOperator function to a string
     *
     * @param {function} value The function being converted
     * @returns {string} The string representation of the function
     */
    static toString (value) {
        switch (value) {
            case RuleOperator.is:
                return 'is';
            case RuleOperator.isNot:
                return 'is not';
            case RuleOperator.contains:
                return 'contains';
            case RuleOperator.doesNotContain:
                return 'does not contain';
            case RuleOperator.lessThan:
                return 'is less than';
            case RuleOperator.greaterThan:
                return 'is greater than';
            default:
                return '';
        }
    }
}

class ObservableRuleArray extends Array {
    constructor () {
        super();

        this.elementUpdatedEvent = new Event(this);
        this.elementAddedEvent = new Event(this);
        this.elementRemovedEvent = new Event(this);
    }

    push (element) {
        super.push(element);

        if (element instanceof Rule) {
            element.targetPropertyUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
            element.operatorUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
            element.targetValueUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
        }
        else if (element instanceof RuleGroup) {
            element.nameUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
            element.allowReprintsUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
            element.groupTypeUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
            element.resultTypeUpdatedEvent.attach(this._onElementPropertyUpdated.bind(this));
        }

        this.elementAddedEvent.notify({
            index: this.indexOf(element),
            element: element
        });
    }

    splice (start, deleteCount, ...items) {
        if (start === undefined) {
            start = 0;
        }

        if (deleteCount === undefined) {
            deleteCount = this.length - start;
        }

        let results = super.splice(start, deleteCount, ...items);

        for (let element of results) {
            if (element instanceof Rule) {
                element.targetPropertyUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
                element.operatorUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
                element.targetValueUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
            }
            else if (element instanceof RuleGroup) {
                element.nameUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
                element.allowReprintsUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
                element.groupTypeUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
                element.resultTypeUpdatedEvent.
                    unattach(this._onElementPropertyUpdated.bind(this));
            }

            this.elementRemovedEvent.notify({
                element: element
            });
        }

        return results;
    }

    _onElementPropertyUpdated (sender) {
        this.elementUpdatedEvent.notify(sender);
    }
}

/** Representation of a rule
 * @class
 *
 *
 */
class Rule {
    /**
     * 
     * @param {string} name 
     */
    constructor (name = '') {
        /** @type {string} */
        this._name = name;
        /** @type {string} */
        this._targetProperty = '';
        /** @type {function} */
        this._operator = null;
        /** @type {string} */
        this._targetValue = '';

        this.targetPropertyUpdatedEvent = new Event(this);
        this.operatorUpdatedEvent = new Event(this);
        this.targetValueUpdatedEvent = new Event(this);
    }

    // #region Properties

    /** @type {string} */
    get naem () {
        return this._name;
    }

    set name (value) {
        if (this._name !== value) {
            this._name = value;
        }
    }

    /** @type {string} */
    get targetProperty () {
        return this._targetProperty;
    }

    set targetProperty (value) {
        if (this._targetProperty !== value) {
            this._targetProperty = value;
            this.targetPropertyUpdatedEvent.notify(this.targetProperty);
        }
    }

    /** @type {funcction} */
    get operator () {
        return this._operator;
    }

    set operator (value) {
        if (this._operator !== value) {
            this._operator = value;
            this.operatorUpdatedEvent.notify(this.operator);
        }
    }

    /** @type {string} */
    get targetValue () {
        return this._targetValue;
    }

    set targetValue (value) {
        if (this._targetValue !== value) {
            this._targetValue = value;
            this.targetValueUpdatedEvent.notify(this.targetValue);
        }
    }

    // #endregion

    /**
     * 
     * @param {Comic} comic 
     */
    apply (comic) {
        return this.operator(comic[this.targetProperty].toString(), this.targetValue.toString());
    }

    toString () {
        return this.targetProperty.toTitleCase() + ' ' + RuleOperator.toString(this.operator) + ' ' + this.targetValue;
    }
}

class RuleGroup {
    /**
     * 
     * @param {string} name 
     * @param {boolean} allowReprints 
     */
    constructor (name = '', allowReprints = false) {
        /** @type {string} */
        this._name = name;

        /** @type {boolean} */
        this._allowReprints = allowReprints;

        /** @type {RuleGroupType} */
        this._groupType = RuleGroupType.any;

        /** @type {RuleResultType} */
        this._resultType = RuleResultType.none;

        /** @type {Array.<(Rule | RuleGroup)>} */
        this.rules = new ObservableRuleArray();

        this.nameUpdatedEvent = new Event(this);
        this.allowReprintsUpdatedEvent = new Event(this);
        this.groupTypeUpdatedEvent = new Event(this);
        this.resultTypeUpdatedEvent = new Event(this);
    }

    // #region Properties

    /** @type {string} */
    get name () {
        return this._name;
    }

    set name (value) {
        if (this._name !== value) {
            this._name = value;
            this.nameUpdatedEvent.notify(this.name);
        }
    }

    /** @type {boolean} */
    get allowReprints () {
        return this._allowReprints;
    }

    set allowReprints (value) {
        if (this._allowReprints !== value) {
            this._allowReprints = value;
            this.allowReprintsUpdatedEvent.notify(this.allowReprints);
        }
    }

    /** @type {RuleGroupType} */
    get groupType () {
        return this._groupType;
    }

    set groupType (value) {
        if (this._groupType !== value) {
            this._groupType = value;
            this.groupTypeUpdatedEvent.notify(this.groupType);
        }
    }

    /** @type {RuleResultType} */
    get resultType () {
        return this._resultType;
    }

    set resultType (value) {
        if (this._resultType !== value) {
            this._resultType = value;
            this.resultTypeUpdatedEvent.notify(this.resultType);
        }
    }

    // #endregion

    /**
     * 
     * @param {Comic} comic 
     */
    apply (comic) {
        if (comic.reprint && !this.allowReprints) return;

        for (let rule of this.rules) {
            let result = rule.apply(comic);

            if (this.groupType === RuleGroupType.any && result) {
                markComic(comic, this.resultType);
                return;
            }
            else if (this.groupType === RuleGroupType.all && !result) {
                return;
            }
        }

        if (this.groupType === RuleGroupType.all) {
            markComic(comic, this.resultType);
        }
    }

    /**
     * @returns {string} String representation of the {@link RuleGroup}
     */
    toString () {
        let returnString = '';
        let groupString = '';

        if (this.groupType === RuleGroupType.any) {
            groupString = ' or ';
        }
        else if (this.groupType === RuleGroupType.all) {
            groupString = ' and ';
        }

        for (let i = 0; i < this.rules.length; i++) {
            returnString += this.rules[i].toString();

            if (i !== this.rules.length - 1) {
                returnString += groupString;
            }
        }

        return returnString;
    }
}

/**
 * 
 * @param {Comic} comic 
 * @param {RuleResultType} resultType 
 */
function markComic (comic, resultType) {
    if (resultType === RuleResultType.pull) {
        comic.pulled = true;
    }
    else if (resultType === RuleResultType.watch) {
        comic.watched = true;
    }
}

exports.RuleGroupType = module.exports.RuleGroupType = RuleGroupType;
exports.RuleResultType = module.exports.RuleResultType = RuleResultType;
exports.ObservableRuleArray = module.exports.ObservableRuleArray = ObservableRuleArray;
exports.RuleOperator = module.exports.RuleOperator = RuleOperator;
exports.Rule = module.exports.Rule = Rule;
exports.RuleGroup = module.exports.RuleGroup = RuleGroup;

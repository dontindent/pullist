require('../../misc/utilities');

const RuleGroupType = Object.freeze({
    any: 0,
    all: 1
});

const RuleResultType = Object.freeze({
    none: 0,
    watch: 1,
    pull: 2
});

class RuleOperator {
    /** Evalues if two values match
     *
     * @param {*} value - The value being assessed
     * @param {*} target - The target value being assessed against
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
     * @param {*} value - The value being assessed
     * @param {*} target - The target value being assessed against
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
     * @param {string} value - The value being assessed
     * @param {string} target - the target value being assessed against
     * @returns {boolean} Whether value contains target
     */
    static contains (value, target) {
        return value.toLowerCase().includes(target.toLowerCase());
    }

    /** Evaluates if a string does not contain another string
     *
     * @param {string} value - The value being assessed
     * @param {string} target - the target value being assessed against
     * @returns {boolean} Whether value does not contain target
     */
    static doesNotContain (value, target) {
        return !value.toLowerCase().includes(target.toLowerCase());
    }

    /** Evaluates if one value is less than another
     *
     * @param {number} value - The value being assessed
     * @param {number} target - The target value being assessed against
     * @returns {boolean} Whether value is less than target
     */
    static lessThan (value, target) {
        return value < target;
    }

    /** Evaluates if one value is greater than another
     *
     * @param {number} value - The value being assessed
     * @param {number} target - The target value being assessed against
     * @returns {boolean} Whether value is greater than target
     */
    static greaterThan (value, target) {
        return value > target;
    }

    /** Converts a string representation of a RuleOperator to a function
     *
     * @param {string} value - The string being converted
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
     * @param {function} value - The function being converted
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

/** Representation of a rule
 * @class
 *
 *
 */
class Rule {
    constructor (name = '') {
        /** @member {string} */
        this.name = name;
        /** @member {string} */
        this.targetProperty = '';
        /** @function */
        this.operator = null;
        /** @member {string} */
        this.targetValue = '';
    }

    apply (comic) {
        return this.operator(comic[this.targetProperty].toString(), this.targetValue.toString());
    }

    toString () {
        return this.targetProperty.toTitleCase() + ' ' + RuleOperator.toString(this.operator) + ' ' + this.targetValue;
    }
}

class RuleGroup {
    constructor (name = '', allowReprints = false) {
        this.name = name;
        this.allowReprints = allowReprints;
        this.groupType = RuleGroupType.any;
        this.resultType = RuleResultType.none;
        this.rules = [];
    }

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
exports.RuleOperator = module.exports.RuleOperator = RuleOperator;
exports.Rule = module.exports.Rule = Rule;
exports.RuleGroup = module.exports.RuleGroup = RuleGroup;

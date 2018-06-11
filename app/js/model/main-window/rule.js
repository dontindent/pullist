const RuleGroupType = Object.freeze({
    any: 0,
    all: 1
});

const RuleResultType = Object.freeze({
    none: 0,
    watch: 1,
    pull: 2
});

class RuleOperators {
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
                return RuleOperators.is;
            case 'notqeual':
            case 'isnot':
                return RuleOperators.isNot;
            case 'contains':
                return RuleOperators.contains;
            case 'notcontains':
            case 'doesnotcontain':
                return RuleOperators.doesNotContain;
            case "lessthan":
                return RuleOperators.lessThan;
            case 'greaterthan':
                return RuleOperators.greaterThan;
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
            case RuleOperators.is:
                return 'is';
            case RuleOperators.isNot:
                return 'is not';
            case RuleOperators.contains:
                return 'contains';
            case RuleOperators.doesNotContain:
                return 'does not contain';
            case RuleOperators.lessThan:
                return 'is less than';
            case RuleOperators.greaterThan:
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
}

class RuleGroup {
    constructor (name = '', allowReprints = false) {
        this.name = '';
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
}

function markComic (comic, resultType) {
    if (resultType === RuleResultType.pull) {
        comic.pull(true);
    }
    else if (resultType === RuleResultType.watch) {
        comic.watch(true);
    }
}

exports.RuleGroupType = module.exports.RuleGroupType = RuleGroupType;
exports.RuleResultType = module.exports.RuleResultType = RuleResultType;
exports.RuleOperators = module.exports.RuleOperators = RuleOperators;
exports.Rule = module.exports.Rule = Rule;
exports.RuleGroup = module.exports.RuleGroup = RuleGroup;

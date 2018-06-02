class Utilities {
    static getObjectLength(object) {
        let size = 0;
        for (let key in object) {
            if (object.hasOwnProperty(key)) size++;
        }

        return size;
    }

    static removeDuplicates (myArr, prop) {
        return myArr.filter((obj, pos, arr) => {
            return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
        });
    }

    static exists(object) {
        return (object !== undefined) && (object !== null) && !isNaN(object);
    }
}

Array.prototype.clone = function() {
    return this.slice(0);
};

Object.size = Utilities.getObjectLength;

exports = module.exports = Utilities;
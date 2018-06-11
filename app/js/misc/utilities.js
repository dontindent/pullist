const msUnixEpochTicks = 621355968000000000;

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

// The following two functions are based on the Microsoft implementation of DateTimeOffset.
// A previous version of this idea was implemented as a UWP and historical databases had their times stored as
// DateTimeOffsets. I want to be able to use those old databases.
//
// DateTimeOffset implementation can be found here: https://referencesource.microsoft.com/#mscorlib/system/datetimeoffset.cs
Date.prototype.toMSDateTimeOffset = function () {
    return (this.valueOf() * 10000) + msUnixEpochTicks;
};

Date.fromMSDateTimeOffset = function (ticks) {
    let ticksToMs = (ticks - msUnixEpochTicks) / 10000;
    return new Date(ticksToMs);
};

Date.compareDates = function (d1, d2) {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};

exports = module.exports = Utilities;
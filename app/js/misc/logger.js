class Logger {
    constructor (toConsole) {
        this.messageLog = [];
        this.toConsole = !!toConsole;
    }

    log(message, caller = 'General') {
        let currDate = getDateString(new Date());
        let storeMessage = currDate + ' [' + caller + '] ';

        if (Array.isArray(message)) {
            for (let part of message) {
                storeMessage += part + ' ';
            }
        }
        else {
            storeMessage += message;
        }

        this.messageLog.push(storeMessage);
        if (this.toConsole) console.log(storeMessage);
    }
}

function getDateString(date) {
    return date.getUTCFullYear() +
        '-' + pad(date.getUTCMonth() + 1) +
        '-' + pad(date.getUTCDate()) +
        ' ' + pad(date.getUTCHours()) +
        ':' + pad(date.getUTCMinutes()) +
        ':' + pad(date.getUTCSeconds()) +
        '.' + (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5);
}

function pad (n, width = 2, z = 0) {
    return (String(z).repeat(width) + String(n)).slice(String(n).length);
}

const logger = new Logger(true);
Object.freeze(logger);

exports = module.exports = logger;
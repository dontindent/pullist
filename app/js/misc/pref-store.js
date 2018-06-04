const electron = require('electron');
const path = require('path');
const fs = require('fs');

class PrefStore {
    constructor (opts) {
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        this.path = path.join(userDataPath, opts.configName + '.json');
        this.data = parseDataFile(this.path, opts.defaults);
    }

    get(key) {
        return this.data[key];
    }

    set(key, val) {
        this.data[key] = val;
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    delete(key) {
        if (this.data[key]) {
            delete this.data[key];
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        }
    }
}

function parseDataFile(filePath, defaults) {
    try {
        return JSON.parse(fs.readFileSync(filePath).toString());
    } catch(error) {
        return defaults;
    }
}

exports = module.exports = PrefStore;
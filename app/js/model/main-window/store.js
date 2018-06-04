const electron = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
    constructor(opts) {
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

    static downloadFile(url, callback) {
        let xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            console.log(xhr.readyState);
            console.log(xhr.status);
            if (xhr.readyState === 4 && xhr.status === 200) callback(xhr.responseText);
        };

        xhr.open('GET', url, true);
    }
}

function parseDataFile(filePath, defaults) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        return defaults;
    }
}

module.exports = Store;

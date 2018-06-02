const electron = require('electron');
const SQL = require('sql.js');
const path = require('path');
const fs = require('fs');
const Event = require('./event-dispatcher');

function _rowsFromSqlDataObject(object) {
    let data = {};
    let i = 0;
    // let j = 0;

    for (let valueArray of object.values) {
        data[i] = {};
        let j = 0;
        for (let column of object.columns) {
            Object.assign(data[i], {[column]: valueArray[j]});
            j++;
        }
        i++;
    }

    return data;
}

let _insertPlaceHoldersString = function (length) {
    let places = '';

    for (let i = 1; i <= length; i++) {
        places += '?, ';
    }

    return /(.*),/.exec(places)[1];
};

let _updatePlaceHolderString = function (columns) {
    let places = '';

    columns.forEach(function (column) {
        places += column + ' = ?, ';
    });

    return /(.*),/.exec(places)[1];
};

SQL.dbOpen = function (databaseFileName) {
    try {
        console.log ('Opening database');
        return new SQL.Database(fs.readFileSync(databaseFileName));
    } catch (error) {
        console.log('Can\'t open database file.', error.message);
        return null;
    }
};

SQL.dbClose = function (databaseHandle, databaseFileName) {
    try {
        console.log ('Closing database');
        let data = databaseHandle.export();
        let buffer = Buffer.alloc(data.length, data);
        fs.writeFileSync(databaseFileName, buffer);
        databaseHandle.close();
        databaseHandle = null;
        return true;
    } catch (error) {
        console.log('Can\'t close database file.', error);
        return null
    }
};

class ComicDatabase {
    constructor() {
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        this.dbPath = path.join(userDataPath, 'Comicdb.sqlite');
        this.db = null;

        this.storageReady = new Event(this);
        this.storageError = new Event(this);

        this.comicColumnsWrite = ['Series', 'Number', 'Writer', 'Artist', 'CoverArtist', 'Publisher', 'Description', 'Price', 'Pulled', 'Watched', 'Code', 'CoverURL', 'Reprint', 'Variant', 'ReleaseDate', 'OriginalString', 'MainId'];
    }

    closeDB() {
        let result = SQL.dbClose(this.db, this.dbPath);
        this.db = null;

        return result;
    }

    initDB (callback) {
        this.db = SQL.dbOpen(this.dbPath);

        if (this.db === null) {
            this.createDB();
        } else {
            let query = 'SELECT count(*) as \'count\' FROM \'sqlite_master\'';
            let row = this.db.exec(query);

            let tableCount = parseInt(row[0].values);
            if (tableCount === 0) {
                console.log ('The file is an empty SQLite3 database.');
                this.createDB();
            } else {
                console.log ('The database has', tableCount, 'tables');
                this.storageReady.notify();
            }

            this.closeDB();
            // SQL.closeDB(this.dbManager, this.dbPath);

            if (typeof callback === 'function') {
                callback();
            }
        }
    }

    createDB () {
        this.db = new SQL.Database();
        let query = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
        let result = this.db.exec(query);
        if (Object.keys(result).length === 0 &&
            typeof result.constructor === 'function' &&
            this.closeDB()) {
            // SQL.dbClose(this.dbManager, this.dbPath)) {
            this.storageReady.notify();
            console.log('Created a new database;');
        } else {
            this.storageError.notify();
            console.log ('ComicDatabase.createDB failed');
        }
    }

    insertComic (comic, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'INSERT INTO `Comic`';
            query += ' (`' + this.comicColumnsWrite.join('`, `') + '`)';
            query += ' VALUES (' + _insertPlaceHoldersString(17) + ')';
            let values = [ comic.series, comic.number, comic.writer, comic.artist, comic.coverArtist,
                            comic.publisher, comic.description, comic.price, comic.pulled, comic.watched, comic.code,
                            comic.coverURL, comic.reprint, comic.variant, comic.releaseDate.valueOf(),
                            comic.originalString, comic.mainID ];

            let statement = this.db.prepare(query);

            try {
                if (statement.run(values)) {
                    statement.free();
                    let result = this.getLastInsertId();

                    if (typeof callback === 'function') {
                        comic.id = result[0]['LAST_INSERT_ROWID()'];
                        callback(comic);
                    }
                }
            } catch (error) {
                // throw (error);
                // console.log('ComicDatabase.insertComic', error.message);
            }
        } else {
            this.storageError.notify();
            console.log ('Couldn\'t open database for insert');
        }
    }

    getLastInsertId () {
        let statement = this.db.prepare('SELECT LAST_INSERT_ROWID()');
        try {
            if (statement.step()) {
                let values = [statement.get()];
                let columns = statement.getColumnNames();

                return _rowsFromSqlDataObject({values: values, columns: columns});
            }
        } catch (error) {
            console.log('ComicDatabase.getLastInsertId', error.message);
        }
    }

    updateComic (comic, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'UPDATE `Comic` SET ';
            query += _updatePlaceHolderString(this.comicColumnsWrite);
            query += ' WHERE ID = ?';
            let values = [ comic.series, comic.number, comic.writer, comic.artist, comic.coverArtist,
                comic.publisher, comic.description, comic.price, comic.pulled, comic.watched, comic.code,
                comic.coverURL, comic.reprint, comic.variant, comic.releaseDate.valueOf(),
                comic.originalString, comic.mainID, comic.id ];

            let statement = this.db.prepare(query);

            try {
                if (statement.run(values)) {
                    statement.free();

                    if (typeof callback === 'function') {
                        callback(comic);
                    }
                }
            } catch (error) {
                // throw (error);
                // console.log('ComicDatabase.insertComic', error.message);
            }
        } else {
            this.storageError.notify();
            console.log ('Couldn\'t open database for insert');
        }
    }

    getComicByOriginal (originalString, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT * FROM `Comic` WHERE `OriginalString` IS ?';
            let statement = this.db.prepare(query, [originalString]);

            try {
                let result = null;

                if (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    result = _rowsFromSqlDataObject({values: values, columns: columns})[0];
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                console.log('ComicDatabase.getComicByOriginal', 'No data found for OriginalString =', originalString);
                throw (error);
            }
        } else {
            this.storageError.notify();
            console.log ('Couldn\'t open database for select');
        }
    }

    getComicsByDate (date, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT * FROM `Comic` WHERE `ReleaseDate` IS ?';
            let statement = this.db.prepare(query, [date]);

            try {
                let results = [];

                while (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    results.push(_rowsFromSqlDataObject({values: values, columns: columns}));
                }

                if (typeof callback === 'function') {
                    callback(results);
                }
            } catch (error) {
                console.log('ComicDatabase.getComicsByDate', 'No data found for ReleaseDate =', date);
            } finally {
                this.closeDB();
            }
        } else {
            this.storageError.notify();
            console.log ('Couldn\'t open database for select');
        }
    }
}

exports = module.exports = ComicDatabase;
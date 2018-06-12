const electron = require('electron');
const SQL = require('../../../../node_modules/sql.js/js/sql');
const path = require('path');
const fs = require('fs');
const Event = require('../../misc/event-dispatcher');
// eslint-disable-next-line no-unused-vars
const Utilities = require('../../misc/utilities');

const logger = require('../../misc/logger');

const sender = 'ComicDatabase';

// The following file is based HEAVILY off of https://github.com/patrickmoffitt/local-sqlite-example

function _rowsFromSqlDataObject(object) {
    let data = {};
    let i = 0;

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
        logger.log ('Opening database', sender);
        return new SQL.Database(fs.readFileSync(databaseFileName));
    } catch (error) {
        logger.log('Can\'t open database file.\n' + error.message, sender);
        return null;
    }
};

SQL.dbClose = function (databaseHandle, databaseFileName) {
    try {
        logger.log ('Closing database', sender);
        let data = databaseHandle.export();
        let buffer = Buffer.alloc(data.length, data);
        fs.writeFileSync(databaseFileName, buffer);
        databaseHandle.close();
        databaseHandle = null;
        return true;
    } catch (error) {
        logger.log('Can\'t close database file.\n' + error, sender);
        return null;
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
                logger.log ('The file is an empty SQLite3 database.', sender);
                this.createDB();
            } else {
                logger.log (['The database has', tableCount, 'tables'], sender);
                this.storageReady.notify(null);
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
        let query = fs.readFileSync(path.join(__dirname, '../../../db/schema.sql'), 'utf8');
        let result = this.db.exec(query);
        if (Object.keys(result).length === 0 &&
            typeof result.constructor === 'function' &&
            this.closeDB()) {
            // SQL.dbClose(this.dbManager, this.dbPath)) {
            this.storageReady.notify(null);
            logger.log('Created a new database', sender);
        } else {
            this.storageError.notify(null);
            logger.log ('ComicDatabase.createDB failed', sender);
        }
    }

    getAllDates (callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT DISTINCT `ReleaseDate` FROM Comic ORDER BY `ReleaseDate`';
            let statement = this.db.prepare(query);
            try {
                let results = [];

                while (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    let result = _rowsFromSqlDataObject({values: values, columns: columns})[0];
                    
                    result.ReleaseDate = Date.fromMSDateTimeOffset(result.ReleaseDate).valueOf();

                    results.push(result);
                }
                if (typeof callback === 'function') {
                    callback(results);
                }
            } catch (error) {
                logger.log([ 'ComicDatabase.getAllDates', 'No data found in `Comic` in column ReleaseDate' ], sender);
            } finally {
                this.closeDB();
            }
        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
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
                            comic.coverURL, comic.reprint, comic.variant, (new Date(comic.releaseDate)).toMSDateTimeOffset(),
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
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for insert', sender);
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
            logger.log(['ComicDatabase.getLastInsertId', error.message], sender);
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
                comic.coverURL, comic.reprint, comic.variant, (new Date(comic.releaseDate)).toMSDateTimeOffset(),
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
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for insert', sender);
        }
    }

    getComicById (id, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT * FROM `Comic` WHERE `Id` IS ?';
            let statement = this.db.prepare(query, [ id ]);
            try {
                let result = null;

                if (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    result = _rowsFromSqlDataObject({values: values, columns: columns})[0];
                    result.ReleaseDate = Date.fromMSDateTimeOffset(result.ReleaseDate).valueOf();
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                logger.log(['ComicDatabase.getComicById', 'No data found for Id =', id], sender);
                throw (error);
            }
        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
        }
    }

    getComicByOriginalAndDate (originalString, date, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT * FROM `Comic` WHERE `OriginalString` IS ? and `ReleaseDate` IS ?';
            let statement = this.db.prepare(query, [ originalString, (new Date(date)).toMSDateTimeOffset() ]);
            try {
                let result = null;

                if (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    result = _rowsFromSqlDataObject({values: values, columns: columns})[0];
                    result.ReleaseDate = Date.fromMSDateTimeOffset(result.ReleaseDate).valueOf();
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                logger.log([ 'ComicDatabase.getComicByOriginalAndDate',
                             'No data found for OriginalString =', originalString,
                             'and ReleaseDate =', date], sender);
                throw (error);
            }
        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
        }
    }

    getLastComicBySeriesAndNumber (series, number, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT *, MAX(`ReleaseDate`) FROM `Comic` WHERE `Series` = ? AND `Number` != ?';
            let statement = this.db.prepare(query, [ series, number ]);
            try {
                let result = null;

                if (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    result = _rowsFromSqlDataObject({values: values, columns: columns})[0];
                    result.ReleaseDate = Date.fromMSDateTimeOffset(result.ReleaseDate).valueOf();
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                logger.log([ 'ComicDatabase.getLastComicBySeries',
                             'No data found for Series =', series,
                             'and Number =', number ], sender);
                throw (error);
            }
        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
        }
    }

    getComicsByDate (date, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {
            let query = 'SELECT * FROM `Comic` WHERE `ReleaseDate` IS ?';
            let statement = this.db.prepare(query, [ (new Date(date)).toMSDateTimeOffset() ]);
            try {
                let results = [];

                while (statement.step()) {
                    let values = [statement.get()];
                    let columns = statement.getColumnNames();
                    let result = _rowsFromSqlDataObject({values: values, columns: columns})[0];

                    result.ReleaseDate = Date.fromMSDateTimeOffset(result.ReleaseDate).valueOf();
                    results.push(result);
                }

                if (typeof callback === 'function') {
                    callback(results);
                }
            } catch (error) {
                logger.log(['ComicDatabase.getComicsByDate', 'No data found for ReleaseDate =', date], sender);
            } finally {
                this.closeDB();
            }
        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
        }
    }

    deleteOldUnpulled (date, callback) {
        if (!this.db) {
            this.db = SQL.dbOpen(this.dbPath);
        }

        if (this.db) {

            let query = 'DELETE FROM `Comic` WHERE ( ReleaseDate != ? ) AND ( Pulled != 1)';
            let statement = this.db.prepare(query, [ (new Date(date)).toMSDateTimeOffset() ]);
            try {
                let result = false;

                if (statement.run()) {
                    statement.free();
                    result = true;
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            } catch (error) {
                logger.log(['ComicDatabase.getComicsByDate', 'No data found for ReleaseDate =', date], sender);
            } finally {
                this.closeDB();
            }

        } else {
            this.storageError.notify(null);
            logger.log ('Couldn\'t open database for select', sender);
        }
    }
}

exports = module.exports = ComicDatabase;
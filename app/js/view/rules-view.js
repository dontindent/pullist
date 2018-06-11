const View = require('./view');

const { remote, ipcRenderer, shell } = require('electron');
const userPrefs = remote.getGlobal('userPrefs');
const logger = require('../misc/logger');
const storageInterface = require('../model/main-window/storage-interface');
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class RulesView extends View  {
    constructor () {
        super();
    }

    createChildren() {
        super.createChildren();

        return this;
    }

    setupHandlers() {
        super.setupHandlers();

        return this;
    }

    enable() {
        super.enable();

        return this;
    }

    navigatedTo () {
        super.navigatedTo();
    }

    navigatingFrom () {
        super.navigatingFrom();
    }
}

exports = module.exports = RulesView;
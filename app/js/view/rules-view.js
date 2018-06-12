const View = require('./view');

const { remote, ipcRenderer, shell } = require('electron');
const userPrefs = remote.getGlobal('userPrefs');
const logger = require('../misc/logger');
const Utilities = require('../misc/utilities');
const ipcChannels = require('../misc/ipc-channels');

class RulesView extends View  {
    constructor (ruleCollection) {
        super();

        this.ruleCollection = ruleCollection;
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

        console.log(this.ruleCollection.data);
    }

    navigatingFrom () {
        super.navigatingFrom();
    }
}

exports = module.exports = RulesView;
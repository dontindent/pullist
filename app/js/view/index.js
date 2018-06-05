const { remote, ipcRenderer } = require('electron');
require('electron-titlebar');
require('../misc/utilities');
const $ = require('jquery');

const { Color } = require('../misc/color.js');
const Injector = require('../misc/injector');
const ComicController = require('../controller/comic-controller');
const ComicDataService = require('../model/main-window/comic-data-service');
const ComicCollection = require('../model/main-window/comic-collection');
const ReleasesView = require('./releases');
const storageWindow = remote.getGlobal ('storageWindow');
const userPrefs = remote.getGlobal('userPrefs');
const storageInterface = require('../model/main-window/storage-interface');
const ipcChannels = require('../misc/ipc-channels');

let indexView = null;

$(function() {
    indexView = new IndexView();
});

class IndexView {
    constructor() {
        this._currentController = null;
        this._navCollapsed = false;

        this.init();
    }

    init() {
        this.createChildren();
        this.setupHandlers();
        this.enable();
    }

    createChildren() {
        this.$mainContainer = $('#main-container');
        this.$links = $('a.nav');
        this.$navItems = $('li.nav-item');
        this.$splashscreen = $('#splashscreen');
        this.$windowTitle = $('#electron-titlebar-title');
        this.$hamburgerButton = $('a.hamburger-button');
        this.$navContainer = $('div#nav-container');

        return this;
    }

    setupHandlers() {
        this.accentColorChangedHandler = updateColors.bind(this);
        this.storageReadyHandler = this.storageReady.bind(this);
        this.linkClickedHandler = this.linkClicked.bind(this);
        this.hamburgerClickedHandler = this.hamburgerClicked.bind(this);

        return this;
    }

    enable() {
        this.$windowTitle.hide();
        updateColors(null, userPrefs['accentColor']);

        this._navCollapsed = userPrefs['navCollapsed'];
        if (this._navCollapsed) this.$navContainer.addClass('collapsed');

        storageInterface.storageReadyEvent.attach(this.storageReadyHandler);

        ipcRenderer.on(ipcChannels.accentColorChanged, this.accentColorChangedHandler);
        this.$links.on('click', this.linkClickedHandler);
        this.$hamburgerButton.on('click', this.hamburgerClickedHandler);

        ipcRenderer.send(ipcChannels.getAccentColor, null);

        this.initMVC();

        $(this.$links[0]).trigger('click');

        return true;
    }

    initMVC() {
        Injector.register('comicDataService', ComicDataService);
        let comicCollection = new ComicCollection(Injector.resolve('comicDataService'));
        let releasesView = new ReleasesView(comicCollection);
        this.comicController = new ComicController(comicCollection, releasesView);
    }

    storageReady() {
        // this.$splashscreen.hide();
        this.$splashscreen.fadeOut(400);
        this.$windowTitle.show();
    }

    linkClicked(event) {
        event.preventDefault();

        let link = event.delegateTarget;
        let indexView = this;
        let href = $(link).attr('href');
        let $navItem = $(link).parent();

        indexView.$mainContainer.load(href, function () {
            let oldController = indexView._currentController;

            if (href === 'releases.html') {
                indexView._currentController = indexView.comicController;
            }
            else {
                indexView._currentController = null;
            }

            if (oldController) oldController._view.navigatingFrom();

            if (indexView._currentController) indexView._currentController._view.navigatedTo();

        });

        this.$navItems.removeClass('selected');
        $navItem.addClass('selected');
    }

    hamburgerClicked(event) {
        event.preventDefault();

        let hamburgerButton = event.delegateTarget;

        this.$navContainer.toggleClass('collapsed');
        this._navCollapsed = !this._navCollapsed;

        ipcRenderer.send(ipcChannels.prefSet, {key: 'navCollapsed', value: this._navCollapsed});
    }
}

function updateColors(event, message) {
    if (!message) return;

    let accentObject = new Color(message);
    let accentColor = accentObject.base.hex;
    let accentColorLight1 = accentObject.tint1.hex;
    let accentColorLight2 = accentObject.tint2.hex;
    let accentColorLight3 = accentObject.tint3.hex;
    let accentColorDark1 = accentObject.shade1.hex;
    let accentColorDark2 = accentObject.shade2.hex;
    let accentColorDark3 = accentObject.shade3.hex;

    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-color-light-1', accentColorLight1);
    document.documentElement.style.setProperty('--accent-color-light-2', accentColorLight2);
    document.documentElement.style.setProperty('--accent-color-light-3', accentColorLight3);
    document.documentElement.style.setProperty('--accent-color-dark-1', accentColorDark1);
    document.documentElement.style.setProperty('--accent-color-dark-2', accentColorDark2);
    document.documentElement.style.setProperty('--accent-color-dark-3', accentColorDark3);

    storeAccentColor(accentColor);
}

function storeAccentColor(color) {
    ipcRenderer.send(ipcChannels.prefSet, {key: 'accentColor', value: color});
}

const { remote, ipcRenderer } = require('electron');
require('electron-titlebar');
require('../misc/utilities');
const $ = require('jquery');

const Injector = require('../misc/injector');
const ComicController = require('../controller/comic-controller');
const ComicDataService = require('../model/comic-data-service');
const ComicCollection = require('../model/comic-collection');
const ReleasesView = require('./releases');
const storageWindow = remote.getGlobal ('storageWindow');

let comicController = null;
let $splashscreen = null;
let $windowTitle = null;

$(function() {
    const $mainContainer = $('#main-container');
    const $links = $('a.nav');
    $splashscreen = $('#splashscreen');
    $windowTitle = $('#electron-titlebar-title');

    $windowTitle.hide();

    $links.on('click', function(event) {
        event.preventDefault();

        let href = $(this).attr('href');

        $mainContainer.load(href, function() {
            if (href === 'releases.html'){
                comicController._view.init();
            }
        });
    });

    $($links[0]).trigger('click');

    init();
});

function init() {
    Injector.register('comicDataService', ComicDataService);
    let comicCollection = new ComicCollection(Injector.resolve('comicDataService'));
    let releasesView = new ReleasesView(comicCollection);
    comicController = new ComicController(comicCollection, releasesView);

    ipcRenderer.on ('storageReady', function () {
        $splashscreen.hide();
        $windowTitle.show();
    });
}

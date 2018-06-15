const { clipboard, remote, screen } = require('electron');
const { Menu, MenuItem } = remote;

const path = require('path');
const url = require('url');
const scrollSnapPolyfill = require('css-scroll-snap-polyfill');
const smoothscroll = require('smoothscroll-polyfill');
require('jquery.scrollto');

let modalInUse = false;

class AlertService {
    constructor() {
        this._coverOverlay = null;

    }

    showCoverOverlay (comic) {
        this._coverOverlay = new CoverOverlay(comic);
        this._coverOverlay.comic = comic;

        this._coverOverlay.show();
    }

    hideCoverOverlay () {
        if (!this._coverOverlay) return;
    }

    confirm(title, message, callback) {
        let newWindow = new ConfirmAlertWindow(title, message, callback);
        newWindow.show();

        return newWindow;
    }
}

class ConfirmAlertWindow {
    constructor (title, message, callback, buttons = undefined) {
        this.title = title;
        this.message = message;
        this.buttons = buttons;
        this.modalWindow = null;
        this.callback = callback;

        if (buttons === undefined) {
            this.buttons = [ { id: 'ok', text: 'OK', type: undefined, action: this.ok.bind(this) },
                             { id: 'cancel', text: 'Cancel', type: 'default', action: this.cancel.bind(this) } ]
        }
    }

    show() {
        // Because of a custom handler in main.js, this will create a BrowserWindow using the native window.open,
        // which allows us to access the DOM directly.
        this.modalWindow = window.open(url.format({
                pathname: path.join(__dirname, '../../alert.html'),
                protocol: 'file',
                slashes: true
            }), 'confirm');

        let alert = this;
        let dialog = alert.modalWindow;

        // The window first loads about:blank before navigating to the alert.html page
        // We want to make sure that transition has occurred before we try to act on the DOM
        if (dialog.location.href.includes('alert')) alert.populateInfo();
        else {
            dialog.onload = function () {
                if (dialog.location.href.includes('alert')) {
                    alert.populateInfo();
                    dialog.onload = null;
                }
            };
        }
    }

    populateInfo () {
        let $alertBody = $(this.modalWindow.document.body);

        let $title = $alertBody.find('div#alert-title');
        let $messageTitle = $alertBody.find('p#alert-message-title');
        let $messageText = $alertBody.find('p#alert-message-text');
        let $alertButtons = $alertBody.find('div#alert-buttons');

        $title.text(this.title);
        $messageTitle.text(this.title);
        $messageText.text(this.message);

        let buttons = ConfirmAlertWindow.createButtons(this.buttons);

        buttons.forEach( (button) => {
            $alertButtons.append(button);
        });
    }

    // noinspection JSUnusedLocalSymbols
    ok () {
        this.callback(true);
        this.modalWindow.close();
    }

    // noinspection JSUnusedLocalSymbols
    cancel () {
        this.callback(false);
        this.modalWindow.close();
    }

    static createButtons (buttonList) {
        let buttons = [];

        for (let buttonInput of buttonList) {
            let buttonDiv = document.createElement('div');

            buttonDiv.id = buttonInput.id;
            buttonDiv.className = 'alert-button';

            if(buttonInput.type) buttonDiv.className += ' ' + buttonInput.type;

            buttonDiv.innerHTML = '<span class="button-text">' + buttonInput.text + '</span>';

            if (buttonInput.action) buttonDiv.onclick = buttonInput.action;

            buttons.push(buttonDiv);
        }

        return buttons;
    }
}

class ModalOverlay {
    constructor () {
        this._init();
        this._isVisible = false;
    }

    //#region Setup

    _init () {
        this._createChildren();
        this._setupHandlers();
        this._enable();
    }

    _createChildren () {
        this.$modal = $('div#modal');
        this.$modalBackground = $('div#modal-background');
        this.$modalContent = $('div#modal-content');
    }

    _setupHandlers () {
        this._modalBackgroundClickedHandler = this._onModalBackgroundClicked.bind(this);
        this._modalBackgroundKeyUpHandler = this._onModalBackgroundKeyUp.bind(this);
    }

    _enable () {

    }

    //#endregion

    //#region Event Handlers

    _onModalBackgroundClicked (event) {
        event.preventDefault();
        this.hide();
    }

    _onModalBackgroundKeyUp (event) {
        if (event.which === 27) {
            this.hide();
        }
    }

    //#endregion

    show () {
        if (modalInUse) {
            throw 'Modal currently in use!'
        }

        this._populateContent();
        
        this.$modalBackground.on('click', this._modalBackgroundClickedHandler);
        $(document).on('keyup', this._modalBackgroundKeyUpHandler);
        this.$modal.css('visibility', 'visible');
        
        setTimeout(this._modalVisible.bind(this), 0);

        // this._modalVisible();
        modalInUse = true;
    }

    hide () {
        this.$modal.css('visibility', 'hidden');
        this.$modalBackground.css('opacity', 1.0);
        this.$modalBackground.off('click', this._modalBackgroundClickedHandler);
        $(document).off('keyup', this._modalBackgroundKeyUpHandler);
        this.$modalContent.empty();
        modalInUse = false;
    }

    _populateContent () {
        this.$modalContent.empty();
    }

    _modalVisible () {
        this.$modalBackground.css('opacity', 0.5);
        this._isVisible = true;
    }
}

// TODO Try to figure out how to get CSS to properly scale with window
class CoverOverlay extends ModalOverlay {
    constructor (comic) {
        super();

        this._originalComic = comic;
        this._comic = comic;
        this._prevQueue = [];
        this._nextQueue = [];
    }

    //#region Setup

    _createChildren () {
        super._createChildren();
    }

    _setupHandlers () {
        super._setupHandlers();
        this._closeButtonClickedHandler = this._onCloseButtonClick.bind(this);
        this._coverImageLoadedHandler = this._onCoverImageLoad.bind(this);
        this._prevButtonClickedHandler = this._onPrevButtonClick.bind(this);
        this._nextButtonClickedHandler = this._onNextButtonClick.bind(this);
        this._carouselRightClickedHandler = this._onCarouselRightClick.bind(this);
    }

    _enable () {
        super._enable();
    }

    //#endregion

    //#region Properties

    get comic () {
        return this._comic;
    }

    set comic (value) {
        this._comic = value;
    }

    //#endregion

    //#region Event Handlers

    _onCloseButtonClick (event) {
        event.preventDefault();
        this.hide();
    }

    _onCoverImageLoad () {
        this.$coverCarousel.css('opacity', 1.0); 
    }
    
    _onPrevButtonClick (event) {
        event.preventDefault();

        if (!this._prevQueue.length) throw 'No previous comic cover to load.'

        let tempComic = this._prevQueue.pop();
        this._nextQueue.unshift(this.comic);
        this.comic = tempComic;
        
        this.$coverCarousel.scrollTo(this._imageDict[tempComic.originalString], 200);

        this._updateComic();
    }

    _onNextButtonClick (event) {
        event.preventDefault();
        
        if (!this._nextQueue.length) throw 'No next comic cover to load.'

        let tempComic = this._nextQueue.shift();
        this._prevQueue.push(this.comic);
        this.comic = tempComic;

        this.$coverCarousel.scrollTo(this._imageDict[tempComic.originalString], 200);

        this._updateComic();
    }

    _onCarouselRightClick (event) {
        event.preventDefault;

        this.comicImageContextMenu.popup(remote.getCurrentWindow());
    }

    //#endregion

    _populateContent () {
        super._populateContent();

        this._prevQueue = [];
        this._nextQueue = [].concat(this.comic.variantList);
        this._imageDict = new Map();

        let imageArray = [ this.comic ].concat(this.comic.variantList);
        
        let $modalContentRoot = $($('#cover-overlay-template').prop('content')).find('div#cover-overlay-container');
        let $modalContentRootClone = $modalContentRoot.clone();
        
        this.$modalTitle = $modalContentRootClone.find('h2#cover-overlay-title-text');
        this.$closeButton = $modalContentRootClone.find('a#cover-overlay-close-button');
        this.$coverCarousel = $modalContentRootClone.find('div#cover-image-carousel');
        this.$coverImagesContainer = $modalContentRootClone.find('div#cover-images-container');
        this.$transitionCoverImage = $modalContentRootClone.find('img#cover-overlay-transition-image');
        this.$prevButton = $modalContentRootClone.find('a#previous-cover');
        this.$nextButton = $modalContentRootClone.find('a#next-cover');

        for (let variant of imageArray) {
            this._constructCoverImage(variant);
        }

        this.$modalCoverImage = this.$coverImagesContainer.children(':first');
        this.$coverCarousel.css('opacity', 0.0);
        
        this.$closeButton.on('click', this._closeButtonClickedHandler);
        this.$modalCoverImage.on('load', this._coverImageLoadedHandler);
        this.$prevButton.on('click', this._prevButtonClickedHandler);
        this.$nextButton.on('click', this._nextButtonClickedHandler);
        this.$coverCarousel.on('contextmenu', this._carouselRightClickedHandler);

        this._updateComic();

        this._constructContextMenu();

        $modalContentRootClone.appendTo(this.$modalContent);
    }

    _constructCoverImage (variant) {
        let coverImage = new Image();
        coverImage.className = 'cover-overlay-cover-image';
        coverImage.src = variant.coverURL;
        coverImage.id = variant.originalString;
        this._imageDict[variant.originalString] = coverImage;
        $(coverImage).appendTo(this.$coverImagesContainer);
    }

    _constructContextMenu () {
        let modal = this;
        this.comicImageContextMenu = new Menu();
        this.comicImageContextMenu.append(new MenuItem({
            label: 'Copy URL',
            click () {
                clipboard.writeText(modal.$modalCoverImage[0].src);
            }
        }));
        this.comicImageContextMenu.append(new MenuItem({
            label: 'Copy Image',
            click () {
                let contents = remote.getCurrentWebContents();
                let pointer = screen.getCursorScreenPoint();
                contents.copyImageAt(pointer.x, pointer.y);
            }
        }));
    }

    _updateComic () {        
        this.$modalTitle.text(this.comic.originalString);

        if (this._isVisible) {
            this.$modalCoverImage = this.$coverImagesContainer.find($(this._imageDict[this.comic.originalString]));
            this.$coverCarousel.css('width', this.$modalCoverImage.width());
            this.$coverCarousel.css('max-width', this.$modalCoverImage.width());
        }

        if (!this._prevQueue.length) {
            this.$prevButton.addClass('modal-disabled');
        }
        else {
            this.$prevButton.removeClass('modal-disabled');
        }

        if (!this._nextQueue.length) {
            this.$nextButton.addClass('modal-disabled');
        }
        else {
            this.$nextButton.removeClass('modal-disabled');
        }
    }
    
    hide () {
        this.$closeButton.off('click', this._closeButtonClickedHandler);
        this.$modalCoverImage.off('load', this._coverImageLoadedHandler);
        this.$prevButton.off('click', this._prevButtonClickedHandler);
        this.$nextButton.off('click', this._nextButtonClickedHandler);
        
        super.hide();
    }

    _modalVisible () {
        scrollSnapPolyfill();
        smoothscroll.polyfill();
        super._modalVisible();

        this.$coverCarousel.css('width', this.$modalCoverImage.width());
        this.$coverCarousel.css('max-width', this.$modalCoverImage.width());
        this.$coverCarousel.css('opacity', 1.0);
    }
}

exports.AlertService = module.exports.AlertService = AlertService;
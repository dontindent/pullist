const path = require('path');
const url = require('url');

let modalInUse = false;

class AlertService {
    constructor() {
        this._coverOverlay = null;

    }

    showCoverOverlay (comic) {
        if (!this._coverOverlay) this._coverOverlay = new CoverOverlay(comic);
        else this._coverOverlay.comic = comic;

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
    }
}

class CoverOverlay extends ModalOverlay {
    constructor (comic) {
        super();

        this._comic = comic;
    }

    //#region Setup

    _createChildren () {
        super._createChildren();
    }

    _setupHandlers () {
        super._setupHandlers();
        this._closeButtonClicedkHandler = this._onCloseButtonClicked.bind(this);
        
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

    _onCloseButtonClicked (event) {
        event.preventDefault();
        this.hide();
    }

    //#endregion

    _populateContent () {
        super._populateContent();

        let $modalContentRoot = $($('#cover-overlay-template').prop('content')).find('div#cover-overlay-container');
        let $modalContentRootClone = $modalContentRoot.clone();

        let $modalTitle = $modalContentRootClone.find('h2#cover-overlay-title-text');
        this.$modalCoverImage = $modalContentRootClone.find('img#cover-overlay-cover-image');
        this.$closeButton = $modalContentRootClone.find('a#cover-overlay-close-button');
        
        this.$closeButton.on('click', this._closeButtonClicedkHandler);

        $modalTitle.text(this.comic.originalString);
        this.$modalCoverImage.attr('src', this.comic.coverURL);

        $modalContentRootClone.appendTo(this.$modalContent);
    }

    _modalVisible () {
        super._modalVisible();
        this.$modalCoverImage.css('opacity', 1.0);     
    }

    hide () {
        this.$closeButton.off('click', this._closeButtonClicedkHandler);

        super.hide();
    }
}

exports.AlertService = module.exports.AlertService = AlertService;
const electron = require('electron');
const path = require('path');
const url = require('url');

class Alert {
    constructor() {

    }

    static confirm(title, message, callback) {
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
            // noinspection JSUnusedLocalSymbols
            dialog.onload = function (event) {
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
    ok (event) {
        this.callback(true);
        this.modalWindow.close();
    }

    // noinspection JSUnusedLocalSymbols
    cancel (event) {
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

exports.Alert = module.exports.Alert = Alert;
// exports.ConfirmAlertWindow = module.exports.ConfirmAlertWindow = ConfirmAlertWindow;
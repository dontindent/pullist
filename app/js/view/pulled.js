const { remote, shell } = require('electron');
// noinspection JSUnusedLocalSymbols
const logger = require("../misc/logger");
const { ComicListView } = require('./comic-list-view');
const { Alert } = require('./alert');
const Pikaday = require('pikaday');

const isWindows = remote.getGlobal('isWindows');

// Using Native Windows Features from Electron
// https://felixrieseberg.com/using-native-windows-features-from-electron/

// NodeRT
// https://github.com/NodeRT/NodeRT#ConsumingNodeRT

// Unable to show Share UI in desktop bridge app
// https://stackoverflow.com/questions/46327238/unable-to-show-share-ui-in-desktop-bridge-app

// Share data
// https://docs.microsoft.com/en-us/windows/uwp/app-to-app/share-data

// NodeRT can't be used for UWP/WinRT methods which must be called on the UI thread
// https://github.com/NodeRT/NodeRT/issues/62

// Using Native Node Modules
// https://github.com/electron/electron/blob/v0.37.2/docs/tutorial/using-native-node-modules.md#using-native-node-modules

// Convert your Electron app using the Desktop Bridge
// https://blogs.msdn.microsoft.com/appconsult/2017/03/14/convert-your-electron-app-using-the-desktop-bridge/

// .\node_modules\.bin\electron-rebuild.cmd

// .net native extension for node.js
// https://stackoverflow.com/questions/11257690/net-native-extension-for-node-js

class PulledView extends ComicListView {
    constructor (comicCollection) {
        super(comicCollection);

        // noinspection JSUnusedGlobalSymbols1
        this.callerString = 'PulledView';
        this.navigatedFrom = false;
        this.listPrice = 0.0;
        this.listCount = 0;
        this.selectedDate = null;
    }

    createChildren () {
        super.createChildren();

        this.$datePicker = $('a#datepicker');
        this.$shareListButton = $('a#comic-list-share-button');
        this.$listPrice = $('span#comic-pulled-info-price');
        this.$listCount = $('span#comic-pulled-info-count');
    }

    setupHandlers () {
        super.setupHandlers();

        this.datePickerClickHandler = this.datePickerClick.bind(this);
        this.isValidDateHandler = this.isValidDate.bind(this);
        this.shareListButtonHandler = this.shareListButton.bind(this);
    }

    enable () {
        super.enable();

        this.$shareListButton.on('click', this.shareListButtonHandler);
        this.$datePicker.on('click', this.datePickerClickHandler);
    }

    // TODO Add calendar icon next to list header (make link display: flex and flex-direction: column)
    // TODO Add styling to list header link
    navigatedTo() {
        super.navigatedTo();
        this.assessPullList();

        this.selectedDate = this._comicCollection.currentDate;
        this.navigatedFrom = false;


        let field = document.getElementById('datepicker');
        let picker = new Pikaday({
            field: field,
            defaultDate: this.selectedDate,
            setDefaultDate: true,
            showDaysInNextAndPreviousMonths: true,
            enableSelectionDaysInNextAndPreviousMonths: true,
            disableDayFn: this.isValidDateHandler,
            i18n: {
                previousMonth : 'Previous Month',
                nextMonth     : 'Next Month',
                months        : ['January','February','March','April','May','June','July','August','September','October','November','December'],
                weekdays      : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
                weekdaysShort : ['Su','Mo','Tu','We','Th','Fr','Sa']
            },
            onselect: function (date) {
                field.date = picker.toString();
            }.bind(this)
        });

        console.log(this._comicCollection.availableDates);
    }

    navigatingFrom () {
        super.navigatingFrom();

        this.navigatedFrom = true;
    }

    comicPullButton (event) {
        let comic = event.data.comic;
        let superComicPullButton = super.comicPullButton.bind(this);

        if (comic.pulled === true) {
            this.confirmUnPull(comic, event, superComicPullButton);
        }
        else {
            super.comicPullButton(event);
        }
    }

    shareListButton (event) {
        event.preventDefault();

        let mailString = 'mailto:?subject=' +
            encodeURIComponent('Pull List for ' + this._comicCollection.currentDate.toLocaleDateString("en-US")) +
            '&body=' +
            encodeURIComponent(this.generatePullListString());

        console.log(mailString);

        shell.openExternal(mailString);
    }

    datePickerClick (event) {
        event.preventDefault();
    }

    isValidDate (date) {
        for (let availableDate of this._comicCollection.availableDates) {
            if (availableDate.getDate() === date.getDate() &&
                availableDate.getMonth() === date.getMonth() &&
                availableDate.getFullYear() === date.getFullYear()) return false;
        }

        return true;
    }

    comicsStable (sender, args) {
        super.comicsStable(sender, args);
    }

    comicsUnstable (sender, args) {
        super.comicsUnstable(sender, args);
    }

    modelComicPulled(sender, args) {
        super.modelComicPulled(sender, args);

        this.createList(this._comicCollection.comicsByPublisher);
        this.assessPullList();
    }

    unPullSelectedModelComic (event) {
        let comic = this._selectedComicElement.comic;
        let superUnPull = super.unPullSelectedModelComic.bind(this);

        this.confirmUnPull(comic, event, superUnPull);
    };

    confirmUnPull (comic, event, funIfTrue) {
        let title = 'Unpull comic?';
        let message = 'Are you sure you want to remove ' + comic.title + ' from your pull list?';

        Alert.confirm(title, message, function (result) {
            if (result) funIfTrue(event);
            else event.preventDefault();
        });
    }

    generateDateString () {
        return 'Pull list for ' + this._comicCollection.currentDate.toLocaleDateString("en-US");
    }

    defaultComicListFilter (comic) {
        return super.defaultComicListFilter(comic) && comic.pulled;
    }

    assessPullList () {
        this.listPrice = 0;
        this.listCount = 0;

        for (let comicKey in this._comicCollection.comicDict) {
            if (!this._comicCollection.comicDict.hasOwnProperty(comicKey)) continue;

            let comic = this._comicCollection.comicDict[comicKey];

            if (this.defaultComicListFilter(comic)) {
                this.listPrice += comic.price;
                this.listCount++;
            }
        }

        this.$listPrice.text(this.listPrice.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        }));

        let countString = this.listCount !== 1 ? this.listCount + ' comics in list' : this.listCount + ' comic in list';

        this.$listCount.text(countString);
    }

    // TODO Ensure that string list order matches screen order
    generatePullListString() {
        let pullListString = '';

        for (let comicKey in this._comicCollection.comicDict) {
            if (!this._comicCollection.comicDict.hasOwnProperty(comicKey)) continue;

            let comic = this._comicCollection.comicDict[comicKey];

            if (this.defaultComicListFilter(comic)) {
                pullListString += comic.title + '\n';
                console.log(pullListString, comic);
            }
        }

        return pullListString;
    }
}

exports = module.exports = PulledView;
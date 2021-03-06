const { remote, shell } = require('electron');
const Event = require("../misc/event-dispatcher");
const logger = require("../misc/logger");
// eslint-disable-next-line no-unused-vars
const Utilities = require('../misc/utilities');
const { ComicListView } = require('./comic-list-view');
const Pikaday = require('pikaday');

// eslint-disable-next-line no-unused-vars
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

// TODO Save and restore state based on navigation
class PulledView extends ComicListView {
    constructor (comicCollection, storageInterface, alertService, electronHelper) {
        super(comicCollection, storageInterface, alertService, electronHelper);

        this.callerString = 'PulledView';
        // noinspection JSUnusedGlobalSymbols
        this.navigatedFrom = false;
        this.listPrice = 0.0;
        this.listCount = 0;
        this._selectedDate = null;

        this.selectedDateChangedEvent = new Event(this);
    }

    // #region Setup

    createChildren () {
        super.createChildren();

        this.$shareListButton = $('a#comic-list-share-button');
        this.$datePicker = $('a#datepicker');
        this.$calendarIcon = $('i#calendar-icon');
        this.$prevDateButton = $('a#pulled-header-prev-date');
        this.$nextDateButton = $('a#pulled-header-next-date');
        this.$listPrice = $('span#comic-pulled-info-price');
        this.$listCount = $('span#comic-pulled-info-count');
    }

    setupHandlers () {
        super.setupHandlers();

        this.shareListButtonHandler = this._onShareListButtonClick.bind(this);
        this.datePickerClickHandler = this._onDatePickerClick.bind(this);
        this.isValidDateHandler = this.isSelectableDate.bind(this);
        this.prevDateButtonClickHandler = this._onPrevDateButtonClick.bind(this);
        this.nextDateButtonClickHandler = this._onNextDateButtonClick.bind(this);
    }

    enable () {
        super.enable();

        this.$shareListButton.on('click', this.shareListButtonHandler);
        this.$datePicker.on('click', this.datePickerClickHandler);
        this.$prevDateButton.on('click', this.prevDateButtonClickHandler);
        this.$nextDateButton.on('click', this.nextDateButtonClickHandler);
    }

    // #endregion

    // #region Properties

    get selectedDate () {
        return this._selectedDate;
    }

    set selectedDate (date) {
        if (Date.compareDates(date, this._selectedDate)) return;

        this._selectedDate = date;
        this.updateDateElements();
        this.selectedDateChangedEvent.notify(date);
    }

    // #endregion

    // #region Handlers

    _onComicPullButtonClick (event) {
        let comic = event.data.comic;
        let superComicPullButton = super.comicPullButton.bind(this);

        if (comic.pulled) {
            this.confirmUnPull(comic, event, superComicPullButton);
        }
        else {
            super._onComicPullButtonClick(event);
        }
    }

    _onDatePickerClick (event) {
        event.preventDefault();

        if (!this.picker) return;

        // noinspection JSUnresolvedVariable
        if (this.picker.isOpen) {
            event.delegateTarget.blur();
            this.picker.isOpen = false;
        }
        else this.picker.isOpen = true;
    }
    
    _onModelComicPulled (sender, args) {
        super._onModelComicPulled(sender, args);

        this.createList(this._comicCollection.comicsByPublisher);
        this.assessPullList();
    }
    
    _onPrevDateButtonClick (event) {
        event.preventDefault();

        let availableDates = this._comicCollection.availableDates;
        let numDates = this._comicCollection.availableDates.length;
        let dateElements = [];

        for (let i = 0; i < numDates; i++) {
            if (Date.compareDates(availableDates[i], this.selectedDate)) {
                this.selectedDate = dateElements.pop();
                break;
            }
            else {
                dateElements.push(availableDates[i]);
            }
        }

        this.updateDateElements();
    }

    _onNextDateButtonClick (event) {
        event.preventDefault();

        let availableDates = this._comicCollection.availableDates;
        let numDates = this._comicCollection.availableDates.length;
        let dateElements = [];

        for (let i = numDates - 1; i >=  0; i--) {
            if (Date.compareDates(availableDates[i], this.selectedDate)) {
                this.selectedDate = dateElements.pop();
                break;
            }
            else {
                dateElements.push(availableDates[i]);
            }
        }

        this.updateDateElements();
    }

    _onRetrievedComics (sender, args, status) {
        super._onRetrievedComics (sender, args, status);

        this.assessPullList();
    }

    _onShareListButtonClick (event) {
        event.preventDefault();

        let mailString = 'mailto:?subject=' +
            encodeURIComponent('Pull List for ' + this._comicCollection.currentDate.toLocaleDateString("en-US")) +
            '&body=' +
            encodeURIComponent(this.generatePullListString());

        shell.openExternal(mailString);
    }

    _onUnPullSelectedModelComic (event) {
        let comic = this._selectedComicElement.comic;
        let superUnPull = super._onUnPullSelectedModelComic.bind(this);

        this.confirmUnPull(comic, event, superUnPull);
    }

    // #endregion


    navigatedTo () {
        this._selectedDate = this._comicCollection.currentDate;

        super.navigatedTo();

        // noinspection JSUnusedGlobalSymbols
        this.navigatedFrom = false;
        let pulledView = this;

        let field = document.getElementById('datepicker');
        this.picker = new Pikaday({
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
            onSelect: (date) => {
                pulledView.selectedDate = date;
                pulledView.picker.isOpen = false;
            }
        });
        this.picker.isOpen = false;

        this.updateDateElements();
    }

    navigatingFrom () {
        super.navigatingFrom();

        // noinspection JSUnusedGlobalSymbols
        this.navigatedFrom = true;
    }

    isSelectableDate (date) {
        for (let availableDate of this._comicCollection.availableDates) {
            if (Date.compareDates(date, availableDate)) return false;
        }

        return true;
    }

    confirmUnPull (comic, event, funIfTrue) {
        let title = 'Unpull comic?';
        let message = 'Are you sure you want to remove ' + comic.title + ' from your pull list?';
        
        this._alertService.confirm(title, message, function (result) {
            if (result) funIfTrue(event);
            else event.preventDefault();
        });
    }

    generateDateString () {
        return 'Pull list for ' + this.selectedDate.toLocaleDateString("en-US");
    }

    defaultComicListFilter (comic) {
        return super.defaultComicListFilter(comic) && comic.pulled;
    }

    assessPullList () {
        this.listPrice = 0;
        this.listCount = 0;

        for (let comic of this._comicCollection.comicDict.values()) {
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

        logger.log('Assessed pull list', this.callerString);
    }

    generatePullListString () {
        let pullListString = '';

        for (let publisher of this._comicCollection.comicsByPublisher.keys()) {
            for (let comic of this._comicCollection.comicsByPublisher.get(publisher)) {
                if (this.defaultComicListFilter(comic)) {
                    pullListString += comic.title + '\n';
                }
            }
        }

        return pullListString;
    }

    updateDateElements () {
        // If no date is selected, we assume that no data exists in the database, 
        // and that there are no other pull lists to select from
        if (!this.selectedDate) {
            this.$calendarIcon.hide();
            this.$nextDateButton.addClass('disabled');
            this.$prevDateButton.addClass('disabled');

            return;
        }

        this.$calendarIcon.show();

        if (Date.compareDates(this.selectedDate, this._comicCollection.latestDate)) {
            this.$nextDateButton.addClass('disabled');
        }
        else {
            this.$nextDateButton.removeClass('disabled');
        }

        if (Date.compareDates(this.selectedDate, this._comicCollection.earliestDate)) {
            this.$prevDateButton.addClass('disabled');
        }
        else {
            this.$prevDateButton.removeClass('disabled');
        }

        this.picker.setDate(this.selectedDate);
        this.picker.gotoDate(this.selectedDate);
    }
}

exports = module.exports = PulledView;
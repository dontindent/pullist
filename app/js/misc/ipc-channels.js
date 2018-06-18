const IPCChannels = Object.freeze({
    storageReady: 'storageReady', 
    storageStability: 'storageStability', 
    
    storeRequest: 'storageRequest', 
    loadRequest: 'loadRequest', 
    loadLastRequest: 'loadLastRequest', 
    deleteRequest: 'deleteRequest', 
    datesRequest: 'datesRequest', 
    
    storeResponse: 'storageResponse', 
    loadResponse: 'loadResponse', 
    loadLastResponse: 'loadLastResponse', 
    deleteResponse: 'deleteResponse', 
    datesResponse: 'datesResponse', 
    
    prefGet: 'prefGet', 
    prefSet: 'prefSet', 
    prefDelete: 'prefDelete', 
    
    prefGetSuccess: 'prefGetSuccess', 
    prefSetSuccess: 'prefSetSuccess', 
    prefDeleteSuccess: 'prefDeleteSuccess', 
    
    getAccentColor: 'getAccentColor', 
    accentColorChanged: 'accentColorChanged'
});

exports = module.exports = IPCChannels;

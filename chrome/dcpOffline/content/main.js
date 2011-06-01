const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://modules/logger.jsm");
Cu.import("resource://modules/exceptions.jsm");
Cu.import("resource://modules/docManager.jsm");
Cu.import("resource://modules/network.jsm");
Cu.import("resource://modules/events.jsm");
Cu.import("resource://modules/preferences.jsm");
Cu.import("resource://modules/fdl-context.jsm");
Cu.import("resource://modules/StringBundle.jsm");
Cu.import("resource://gre/modules/Services.jsm");

/* enabling password manager */
Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);

/* init elements */
/* Add window binding onLoad and onClose*/
window.onload = function() {
    initNetworkCheck();
    initApplication();
}
/**
 * Init the network check
 * Private method : you should never use it
 * @private
 */
function initNetworkCheck() {
    networkChecker.isOffline();
    setTimeout(initNetworkCheck, 15);
}
/**
 * Init the application
 * Private method : you should never use it
 * @private
 */
function initApplication() 
{
    var firstRun = Preferences.get("offline.application.firstRun", true);
    var fullyInitialised = Preferences.get("offline.application.fullyInitialised", false);
    
    initListeners();
    
    if (firstRun) {
        window.openDialog("chrome://dcpoffline/content/wizards/initialization.xul", "","chrome,modal");
    }
    else {
        this.openLoginDialog();
        initValues();
    }
}
/**
 * init all the listener
 * Private method : you should never use it
 * Launch it first : beware this method handle all the behaviour of the application
 * if you break it you break the IHM
 * @private
 */
function initListeners()
{
    logIHM("initListeners");

    applicationEvent.subscribe("initializationWizardEnd", initValues);
    
    applicationEvent.subscribe("changeSelectedDomain", updateDomainPreference);
    applicationEvent.subscribe("postChangeSelectedDomain", updateFamilyList, true);
    applicationEvent.subscribe("postChangeSelectedDomain", updateAbstractList);
    applicationEvent.subscribe("postChangeSelectedDomain", updateOpenDocumentList);
    applicationEvent.subscribe("postChangeSelectedDomain", updateDocManager);

    applicationEvent.subscribe("postChangeSelectedFamily", updateAbstractList);
    applicationEvent.subscribe("postChangeSelectedFamily", updateCurrentFamilyPreference);

    applicationEvent.subscribe("preOpenDocument", prepareDoc);
    applicationEvent.subscribe("openDocument", updateCurrentOpenDocumentPreference);
    applicationEvent.subscribe("openDocument", addDocumentToOpenList);
    applicationEvent.subscribe("openDocument", setPrefCurrentOpenDocument);
    applicationEvent.subscribe("postOpenDocument", openDocument);

    applicationEvent.subscribe("postSynchronize", updateFamilyList);
    applicationEvent.subscribe("postSynchronize", updateAbstractList);

    applicationEvent.subscribe("postUpdateFamilyList", setPrefCurrentSelectedFamily, true);

    applicationEvent.subscribe("postUpdateListOfOpenDocumentsPreference", updateOpenDocumentList);

    applicationEvent.subscribe("askForCloseDocument", tryToCloseDocument);
    
    applicationEvent.subscribe("askForOpenDocument", tryToOpenDocument);

    applicationEvent.subscribe("closeDocument",removeDocumentFromOpenList);
    applicationEvent.subscribe("postCloseDocument", closeDocument);

    applicationEvent.subscribe("close", close);
}
/**
 * Init the values of the IHM
 * Private method : you should never use it
 * @private
 */
function initValues()
{
    logIHM("initValues");
    document.getElementById("domainPopupList").builder.rebuild();
    setPrefCurrentSelectedDomain(true);
    setPrefCurrentSelectedFamily(true);
    setPrefCurrentOpenDocument(true);
}

/* Dialog opener */

/**
 * Open the login dialog
 * Private method : you should never use it
 * @private
 */
function openLoginDialog() {
    window.openDialog("chrome://dcpoffline/content/dialogs/authent.xul", "",
    "chrome,modal");
}
/**
 * Open the new document dialog
 * Private method : you should never use it
 * @private
 */
function openNewDocumentDialog() {
    window.openDialog("chrome://dcpoffline/content/dialogs/newDocument.xul", "",
    "chrome,modal");
}
/**
 * Open the close dialog
 * Private method : you should never use it
 * @private
 */
function openCloseDialog() {
    /*window.openDialog("chrome://dcpoffline/content/dialogs/close.xul", "",
    "chrome,modal");*/
    tryToClose();
}
/**
 * Open the preferences dialog
 * Private method : you should never use it
 * @private
 */
function openPreferences() {
    window.openDialog("chrome://dcpoffline/content/dialogs/preferences.xul", "",
    "chrome,titlebar,toolbar,centerscreen,modal");
}
/**
 * Open the synchro dialog
 * Private method : you should never use it
 * @private
 */
function openSynchro() {
    window.open("chrome://dcpoffline/content/dialogs/synchro.xul", "",
    "chrome,modal");
}
/**
 * Open the log dialog
 * Private method : you should never use it
 * @private
 */
function openLog() {
    window.openDialog("chrome://dcpoffline/content/dialogs/log.xul", "",
    "chrome,modal");
}
/**
 * Open the about dialog
 * Private method : you should never use it
 * @private
 */
function openAbout() {
    window.openDialog("chrome://dcpoffline/content/dialogs/about.xul", "",
    "chrome,modal");
}

//Public Methods
/**
 * Try to change the current selected domain
 * 
 * @param value
 */
function tryToChangeDomain(value) {
    logIHM("try to change Domain "+value);
    var param = {
            domainId : value
    };
    if (!applicationEvent.publish("preChangeSelectedDomain", param)) {
        //TODO add alert message
        alert("unable to change domain");
        setPrefCurrentSelectedDomain();
    }else {
        logConsole("change Domain "+value);
        applicationEvent.publish("changeSelectedDomain", param);
        applicationEvent.publish("postChangeSelectedDomain", param);
    }

}
/**
 * Try to change the current selected family
 * 
 * @param value
 */
function tryToChangeFamily(value) {
    logConsole("try to change selected family "+value);
    var param = {
            famId : value
    };
    if (!applicationEvent.publish("preChangeSelectedFamily", param)) {
        //TODO add alert message
        alert("unable to change selected family");
        setPrefCurrentSelectedFamily();
    }else {
        applicationEvent.publish("changeSelectedFamily", param);
        applicationEvent.publish("postChangeSelectedFamily", param);
    }
}
/**
 * Try to change to open a document
 * this method should also be used to change the state of a document
 * 
 * @param param
 */
function tryToOpenDocument(param) {
    logIHM("try to change open document");
    if (!(param && param.documentId)) {
        return false;
    }
    if (!applicationEvent.publish("preOpenDocument", param)) {
        //TODO add alert message
        alert("unable to change selected document");
        setPrefCurrentOpenDocument();
    }else {
        applicationEvent.publish("openDocument", param);
        applicationEvent.publish("postOpenDocument", param);
    }
    return true;
}
/**
 * Try to change to close a document
 * 
 * @param param
 */
function tryToCloseDocument(param) {
    logConsole("try to close document "+param.documentId);
    if (!(param && param.documentId)) {
        return false;
    }
    if (!applicationEvent.publish("preCloseDocument", param)) {
        //TODO add alert message
        alert("unable to close selected document");
        return false;
    }else {
        applicationEvent.publish("closeDocument", param);
        applicationEvent.publish("postCloseDocument", param);
    }
    return true;
}
/**
 * Try to close the application
 * 
 */
function tryToClose()
{
    if (applicationEvent.publish("preClose")) {
        applicationEvent.publish("close");
    }else{
        //TODO add alert message
        alert("unable to close application");
    }
}

//IHM methods

/**
 * Close the application
 * Private method : you should never use it
 * @private
 */
function close()
{
    Cc['@mozilla.org/toolkit/app-startup;1'].getService(Ci.nsIAppStartup).quit(Ci.nsIAppStartup.eAttemptQuit);
}

/**
 * openDocument in main IHM 
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function openDocument(config) {

    logIHM("openDocument "+config.documentId);

    var doc;
    var template, mode;
    var deck;
    var documentRepresentationId, documentRepresentation;

    deck = document.getElementById('documentsDeck');

    if (config && config.documentId) {

        mode = config.mode || 'view';
        try {
            doc = docManager.getLocalDocument({
                initid : config.documentId
            });
            template = doc.getBinding(mode);
            if (template) {
                template = 'url(file://' + template + ')';
                documentRepresentationId = 'vboxDocument-'+config.documentId;
                documentRepresentation= document.getElementById(documentRepresentationId);
                if(! documentRepresentation ){
                    documentRepresentation = document.createElement('vbox');
                    documentRepresentation.setAttribute('flex', 1);
                    documentRepresentation.setAttribute('initid', config.documentId);
                    documentRepresentation.setAttribute('fromid', doc.getProperty('fromid'));
                    documentRepresentation.setAttribute('fromname', doc.getProperty('fromname'));
                    documentRepresentation.id = documentRepresentationId;
                    documentRepresentation.style.MozBinding = template;
                    documentRepresentation = deck.appendChild(documentRepresentation);
                }
                deck.selectedPanel = documentRepresentation;
            } else {
                throw new BindException(
                        "openDocument :: no template for initid: " + config.documentId);
            }
        } catch (e) {
            alert(e.toString());
            throw (e);
        }
    }else {
        deck.selectedPanel = document.getElementById("vboxDocument-void");
    }

}
/**
 * Close a document
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function closeDocument(config) {

    logIHM("closeDocument "+config.documentId);

    var deck;
    var documentRepresentationId, documentRepresentation;

    if (config && config.documentId) {
        deck = document.getElementById('documentsDeck');
        documentRepresentationId = 'vboxDocument-'+config.documentId;
        documentRepresentation= document.getElementById(documentRepresentationId);
        if(documentRepresentation ){
            deck.removeChild(documentRepresentation);
        } else {
            logConsole(
                    "closeDocument :: document "+config.documentId+" is not open");
        }
    }
}

/**
 * update interface family list
 * 
 * Private method : you should never use it
 * @private
 */
function updateFamilyList(config)
{
    logIHM("updateFamilyList");
    if (config && config.domainId) {
        document.getElementById("famDomainIdParam").textContent = config.domainId;
    }
    document.getElementById("familyList").builder.rebuild();
    applicationEvent.publish("postUpdateFamilyList");
}
/**
 * update abstract list
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateAbstractList(config)
{
    logIHM("updateAbstractList");
    if (config && config.domainId != undefined) {
        document.getElementById("abstractDomainIdParam").textContent = config.domainId;
    }
    if (config && config.famId != undefined) {
        document.getElementById("famIdParam").textContent = config.famId;
    }
    if (config && config.searchValue != undefined) {
        document.getElementById("searchTitleParam").textContent = '%'+config.searchValue+'%';
    }
    document.getElementById("abstractList").builder.rebuild();
    document.getElementById("abstractList").selectedIndex =  -1;
    applicationEvent.publish("postUpdateAbstractList");
}
/**
 * Update documentList IHM
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateOpenDocumentList() 
{
    logIHM("updateOpenDocumentList");
    var documentList = document.getElementById("openDocumentList");

    var currentOpenDocument = getCurrentDocument();
    var currentDocs = getListOfOpenDocuments();
    var currentDocId;

    if (currentOpenDocument) {
        currentOpenDocument =  currentOpenDocument.documentId;
    }

    documentList.removeAllItems();
    documentList.selectedIndex = -1;
    if (currentDocs) {
        for (currentDocId in currentDocs) {
            var currentListItem = documentList.appendItem(currentDocs[currentDocId].title, currentDocId);
            if (currentDocId == currentOpenDocument) {
                documentList.selectedItem = currentListItem;
            }
        }
    }
}
/**
 * Update documentList pref
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function addDocumentToOpenList(config) 
{
    logIHM("addDocumentToOpenList");
    var currentDocs = {};
    if (config && config.documentId) {
        if (getListOfOpenDocuments()) {
            currentDocs = getListOfOpenDocuments();
        }
        var title = docManager.getLocalDocument({initid : config.documentId}).getTitle();
        currentDocs[config.documentId] = { title : title, mode : config.mode};
        Preferences.set("offline.user."+getCurrentDomain()+".currentListOfOpenDocuments",JSON.stringify(currentDocs));
        applicationEvent.publish("postUpdateListOfOpenDocumentsPreference");
    }
}
/**
 * Remove a document from the open list
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function removeDocumentFromOpenList(config) 
{
    logIHM("removeDocumentFromOpenList");
    var currentDocs = {};
    if (config && config.documentId) {
        if (getListOfOpenDocuments()) {
            currentDocs = getListOfOpenDocuments();
        }
        delete currentDocs[config.documentId];
        Preferences.set("offline.user."+getCurrentDomain()+".currentListOfOpenDocuments",JSON.stringify(currentDocs));
        applicationEvent.publish("postUpdateListOfOpenDocumentsPreference");
    }
}
/**
 * Update the selected domain pref
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateDomainPreference(config)
{
    logIHM("updateDomainPreference");
    if (config && config.domainId) {
        Preferences.set("offline.user.currentSelectedDomain", config.domainId);
    }
}
/**
 * Update the doc manager
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateDocManager(config) {
    logIHM("updateDocManager");
    if (config && config.domainId) {
        docManager.setActiveDomain({
            domain : config.domainId
        });
    }
}
/**
 * Update the selected family pref
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateCurrentFamilyPreference(config)
{
    logIHM("updateCurrentFamilyPreference");
    if (config && config.famId) {
        Preferences.set("offline.user."+getCurrentDomain()+".currentSelectedFamily", config.famId);
    }
}
/**
 * Update the current open doc pref
 * Private method : you should never use it
 * @private
 * 
 * @param config
 */
function updateCurrentOpenDocumentPreference(config)
{
    logIHM("updateCurrentOpenDocumentPreference "+config.documentId);
    if (config && config.documentId) {
        Preferences.set("offline.user."+getCurrentDomain()+".currentOpenDocument", JSON.stringify(config));
    }
}
/**
 * Update the IHM with the current selected domain
 * Private method : you should never use it
 * @private
 * 
 * @param propagEvent true if you want to propag the event
 */
function setPrefCurrentSelectedDomain(propagEvent)
{
    logIHM("setPrefCurrentSelectedDomain");
    var domains = document.getElementById("domainList");
    if (!Preferences.get("offline.user.currentSelectedDomain", false) === false) {
        var nbDomains = domains.itemCount;
        for(var i = 0; i < nbDomains; i++) {
            var currentDomain = domains.getItemAtIndex(i);
            if (Preferences.get("offline.user.currentSelectedDomain") == currentDomain.value) {
                domains.selectedIndex = i;
                if (propagEvent) {
                    tryToChangeDomain(currentDomain.value);
                }
                return;
            }
        }
    }
    domains.selectedIndex = -1;
    Preferences.reset("offline.user.currentSelectedDomain");
    if (propagEvent) {
        tryToChangeDomain(null);
    }
}
/**
 * Update the IHM with the current selected family of the domain
 * Private method : you should never use it
 * @private
 * 
 * @param propagEvent
 */
function setPrefCurrentSelectedFamily(propagEvent)
{
    logIHM("setPrefCurrentSelectedFamily");
    var families = document.getElementById("familyList");
    if (!Preferences.get("offline.user."+getCurrentDomain()+".currentSelectedFamily", false) === false) {
        var nbFamilies = families.itemCount;
        for(var i = 0; i < nbFamilies; i++) {
            var currentFamily = families.getItemAtIndex(i);
            if (Preferences.get("offline.user."+getCurrentDomain()+".currentSelectedFamily") == currentFamily.value) {
                families.selectedIndex = i;
                if (propagEvent) {
                    tryToChangeFamily(currentFamily.value);
                }
                return;
            }
        }
    }
    families.selectedIndex = -1;
    Preferences.reset("offline.user."+getCurrentDomain()+".currentSelectedFamily");
    if (propagEvent) {
        tryToChangeFamily(null);
    }
}
/**
 * Update the IHM with the current open document
 * Private method : you should never use it
 * @private
 * 
 * @param propagEvent
 */
function setPrefCurrentOpenDocument(propagEvent)
{
    logIHM("setPrefCurrentOpenDocument "+getCurrentDocument());
    var documents = document.getElementById("openDocumentList");
    var currentDocument = getCurrentDocument();
    var currentListElement, i;
    var nbDocuments;
    if (!currentDocument === false) {
        nbDocuments = documents.itemCount;
        for(i = 0; i < nbDocuments; i++) {
            currentListElement = documents.getItemAtIndex(i);
            if (currentDocument.documentId == currentListElement.value) {
                documents.selectedIndex = i;
                if (propagEvent === true) {
                    tryToOpenDocument(currentDocument);
                }
                return;
            }
        }
    }
    documents.selectedIndex = -1;
    Preferences.reset("offline.user."+getCurrentDomain()+".currentOpenDocument");
    if (propagEvent === true) {
        tryToOpenDocument(null);
    }
}
/**
 * Try to prepare the doc to be displayed
 * Private method : you should never use it
 * Can cancel the display if the document is not ready to be display (in edition...)
 * @private
 * 
 * @param param
 * @returns {Boolean}
 */
function prepareDoc(param) {
    logIHM("prepareDoc");
    var currentDocs = getListOfOpenDocuments();
    var currentDocId;
    var closeResult;
    
    for (currentDocId in currentDocs) {
        if (currentDocId == param.documentId) {
            if (!param.mode){
                param.mode = currentDocs[currentDocId].mode;
            }
            if (currentDocs[currentDocId].mode != param.mode){
                return tryToCloseDocument(param);
            }
        }
    }
    
    if (!param.mode){
        param.mode = 'view';
    }
    
    return true;
}
//shortcut
/**
 * Get the current selected domain
 * 
 * Private method : you should never use it
 * @private
 */
function getCurrentDomain() {
    return Preferences.get("offline.user.currentSelectedDomain", "");
}
/**
 * Get the current open document
 * 
 * Private method : you should never use it
 * @private
 */
function getCurrentDocument() {
    var currentOpenDocument = {};
    try {    
        currentOpenDocument = JSON.parse(Preferences.get("offline.user."+getCurrentDomain()+".currentOpenDocument", "{}"));
    } catch (e) {
        logConsole("getCurrentDocument "+e+" "+e.message+" "+e.fileName+" "+e.lineNumber+" "+e);
    }
    if (currentOpenDocument && currentOpenDocument.documentId) {
        currentOpenDocument = currentOpenDocument;
    }else {
        currentOpenDocument = false;
    }
    return currentOpenDocument;
}
/**
 * Get the current list of open documents
 * 
 * Private method : you should never use it
 * @private
 */
function getListOfOpenDocuments() {
    var openList = {};
    try {    
        openList = JSON.parse(Preferences.get("offline.user."+getCurrentDomain()+".currentListOfOpenDocuments", "{}"));
    } catch (e) {
        logConsole("getCurrentDocument "+e+" "+e.message+" "+e.fileName+" "+e.lineNumber+" "+e);
    }
    return openList;
}
/**
 * Shortcut to the logConsole
 * 
 */
function logIHM(message) {
    logConsole(message);
}

/* debug stuff */

/* required for venkman */
function toOpenWindowByType(inType, uri) {
    var winopts = "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar";
    window.open(uri, "_blank", winopts);
}

function debugDisplayDoc(initid)
{
    document.getElementById("document").value = JSON.stringify(docManager.getLocalDocument({initid : initid}));
}
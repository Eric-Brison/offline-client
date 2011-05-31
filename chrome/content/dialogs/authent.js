const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://modules/logger.jsm");
Cu.import("resource://modules/authentifier.jsm");
Cu.import("resource://modules/preferences.jsm");
Cu.import("resource://modules/events.jsm");
Cu.import("resource://modules/passwordManager.jsm");

/**
 * Try to log with the information of the dialog
 * 
 * @returns {Boolean}
 */
function doOk() {
    logIHM('Authent : doOk');

    if (document.getElementById('remember').checked) {
        Preferences.set("offline.user.login", document.getElementById('login').value);
    }
    
    Preferences.set("offline.application.rememberLogin", document.getElementById('remember').checked);
    Preferences.set("offline.application.modeOffline", document.getElementById('modeOffline').checked);
    Preferences.set("offline.application.autoLogin", document.getElementById('autoLogin').checked);

    this.tryToAuthent();
    return false;
}
/**
 * Quit the application
 * 
 * @returns {Boolean}
 */
function doCancel() {
    logIHM('Authent : doCancel');

    if (applicationEvent.publish("preClose")) {
        applicationEvent.publish("close");
    }

    return false;
}

function tryToAuthent() {
    logIHM("Authent : try to authent");
    
    document.getElementById('login').disabled = true;
    document.getElementById('password').disabled = true;
    document.getElementById('remember').disabled = true;
    document.getElementById('modeOffline').disabled = true;
    document.getElementById('autoLogin').disabled = true;
    
    document.getElementById('progressGroup').style.visibility = "visible";
    document.getElementById('progressGroup').hidden = false;
    document.getElementById('errorGroup').style.visibility = "hidden";
    
  //get last value
    var currentLogin = document.getElementById('login').value;
    var currentPassword = document.getElementById('password').value;
    var currentApplicationURl = Preferences.get("offline.user.applicationURL", "");
    
    var modeOffline = document.getElementById('modeOffline').checked;
    var authentReturn ;
    
    authentReturn = authentificator.authent(modeOffline, currentLogin, currentPassword, currentApplicationURl);
    
    if (authentReturn.result) {
        window.close();
    }else {
        logIHM(authentReturn.reason);
        if (authentReturn.reason) {
            document.getElementById('errorLabel').value = authentReturn.reason;
            document.getElementById('errorGroup').style.visibility = "visible";
            document.getElementById('progressGroup').hidden = true;
        }
        
        document.getElementById('login').disabled = false;
        document.getElementById('password').disabled = false;
        document.getElementById('remember').disabled = false;
        document.getElementById('modeOffline').disabled = false;
        document.getElementById('autoLogin').disabled = false;
        document.getElementById('progressGroup').style.visibility = "hidden";
    }
}

function doLoad() {
    logIHM('Authent  : doLoad');
    
    //Update IHM
    
    var currentPassword;
    var login = Preferences.get("offline.user.login", "");
    var autologin = Preferences.get("offline.application.autoLogin", false);
    
    document.getElementById('progressGroup').style.visibility = "hidden";
    document.getElementById('errorGroup').style.visibility = "hidden";
    
    
    if (Preferences.get("offline.application.rememberLogin", false)) {
        document.getElementById('login').value = login;
        currentPassword = passwordManager.getPassword(login);
        if (currentPassword) {
            document.getElementById('password').value = currentPassword;
        }else{
            document.getElementById('password').value = "";
        }
    }
    document.getElementById('remember').checked = Preferences.get("offline.application.rememberLogin", false);
    document.getElementById('modeOffline').checked = Preferences.get("offline.application.modeOffline", false);
    document.getElementById('applicationURL').value = Preferences.get("offline.user.applicationURL", "");
    document.getElementById('autoLogin').checked = autologin;
    
    if (false){
        setTimeout(tryToAuthent, 10);
    }
    
}

function logIHM(message, obj) {
    logConsole(message, obj);
}
Components.utils.import("resource://modules/StringBundle.jsm");
Components.utils.import("resource://modules/logger.jsm");

function initDialog() {
    var translate = new StringBundle(
            "chrome://dcpoffline/locale/main.properties");
    var result = window.arguments[0];

    logConsole('endSync', result);
    if (result.description.status) {
        document.getElementById("resultLabel").value = result.description.status;
    } else {
        if (result.result) {
            document.getElementById("resultLabel").value = translate
                    .get("synchronize.success");
        } else {
            document.getElementById("resultLabel").value = translate
                    .get("synchronize.fail");
        }
    }
    logConsole("Status", result.description);
    if (result.description.manageWaitingUrl) {
        document.getElementById("report").hidden = false;
       // document.getElementById("report").href = result.description.manageWaitingUrl;
    }
    if (result.description.message) {
        document.getElementById("message").hidden = false;
        document.getElementById("message").value = result.description.message;
    }
}

function openServerStatusPage() {
    var result = window.arguments[0];
    if (result && result.description && result.description.manageWaitingUrl) {
        // first construct an nsIURI object using the ioservice
        var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);

        var uriToOpen = ioservice.newURI(result.description.manageWaitingUrl, null, null);

        var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
        .getService(Components.interfaces.nsIExternalProtocolService);

        // now, open it!
        extps.loadURI(uriToOpen);
    }
}
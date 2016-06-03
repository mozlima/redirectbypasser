"use strict";

const {classes: CC, interfaces: CI, utils: CU} = Components;
CU.importGlobalProperties(["atob", "btoa", "URL", "Blob"]);

var document = ((document)? document : null);
var rb;

function startup(startupData, startupReason) {
	var script = "";
	var sandboxs = [];
	var siteruleFormData = {};
	var xhr = function(url, callback, type, responseType) {
		var dx = new Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest")();
		type && dx.overrideMimeType(type);
		dx.open("GET", url, true);
		dx.addEventListener("loadend", callback);
		dx.responseType = ((responseType)? responseType : "");
		dx.send();
	};
	
	xhr(URL.createObjectURL(new Blob(
		["<!DOCTYPE html><html><head><base href=\"http://www.example.com/\" target=\"_blank\"></head><body></body></html>"],
		{type: "text/html"}
	)), function(ev) {
		URL.revokeObjectURL(this.responseURL);
		document = this.response;
			
		xhr("chrome://redirectbypasser/content/content-scripts/content.js", function() {
			script = this.responseText;
			
			rb.optsBuild(storageGet("opts")) && storageSet("opts", OPTS);
			rb.sitesBuildRules((OPTS.replaceUrl)? (storageGet("sitesrules") || SITESRULES) : null);
			windowList(function(win) {
				var i = win.frames.length;
				windowProcess(win);
				
				while (i--) {
					windowProcess(win.frames[i]);
				}
			});
			CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService).addObserver(rb, "document-element-inserted", false);
		}, "text/javascript", "");
	}, "text/html", "document");
	
	CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI.mozIJSSubScriptLoader)
	.loadSubScript("chrome://redirectbypasser/content/background-common.js");
	
	rb.observe = function(observeSubject, observeTopic, observeData) {
		if ((observeTopic == "document-element-inserted") && observeSubject.defaultView) {
			windowProcess(observeSubject.defaultView);
		}
	};
	
	rb.cleanUp = function() {
		CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService).removeObserver(rb, "document-element-inserted", false);
		
		var i = sandboxs.length;
		
		while (i--) {
			sandboxs[i].window.removeEventListener("unload", windowOnUnload, false);
			CU.evalInSandbox("if (typeof redirectBypasser != \"undefined\") {redirectBypasser.stop(true); redirectBypasser = undefined;}", sandboxs[i]);
			CU.nukeSandbox(sandboxs[i]);
		}
		
		sandboxs.length = 0;
		
		windowList(function(win) {
			(win.location.href.indexOf("chrome://redirectbypasser/content/") === 0) && win.close();
		});
	};
	
	function windowList(callback) {
		var wins = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator).getEnumerator("navigator:browser");
		
		while (wins.hasMoreElements()) {
			var win = wins.getNext().QueryInterface(CI.nsIDOMWindow);
			
			if ("gBrowser" in win) {
				var i = (("browsers" in win.gBrowser)? win.gBrowser.browsers.length : 0);
				
				while (i--) {
					callback(win.gBrowser.getBrowserAtIndex(i).contentDocument.defaultView, win);
				}
				
			} else if ("BrowserApp" in win) {
				var i = (("tabs" in win.BrowserApp)? win.BrowserApp.tabs.length : 0);
				
				while (i--) {
					callback(win.BrowserApp.tabs[i].window, win);
				}
			}
		}
	}
	
	function windowOpen(params) {
		var win = CC['@mozilla.org/appshell/window-mediator;1'].getService(CI.nsIWindowMediator).getMostRecentWindow('navigator:browser');
		
		if (win && win.document && (win.document.readyState == "complete")) {
			if ("gBrowser" in win) {
				params.inBackground = !params.active;
				
				win.gBrowser.loadOneTab(params.url, params);
				
			} else if ("BrowserApp" in win) {
				params.selected = params.active;
				win.BrowserApp.addTab(params.url, params);
			}
		}
	}
	
	function windowProcess(win) {
		if (/^(https?|file):/.test(win.location.href)) {
			//debug
			//xhr("content/content-scripts/content.js", function() {script = this.responseText;}, "text/javascript", "");
			var sandbox = new CU.Sandbox(win, {
				sandboxName			: "redirectBypasser (sandbox)",
				sandboxPrototype	: win,
				sameZoneAs			: win,
				wantXrays			: true,
				wantComponents		: false
			});
			
			sandboxs.push(sandbox);
			win.addEventListener("unload", windowOnUnload, false);
			CU.exportFunction(onMessage, sandbox, {defineAs: "sendMessage"});
			CU.evalInSandbox(script, sandbox);
			
		} else if (win.location.href.indexOf("chrome://redirectbypasser/content/") === 0) {
			CU.exportFunction(onMessage, win, {defineAs: "sendMessage"});
			CU.exportFunction(windowList, win, {defineAs: "windowList"});
		}
	}
	
	function windowOnUnload(ev) {
		ev.currentTarget.removeEventListener("unload", windowOnUnload, false);
		
		var i = sandboxs.length;
		
		while (i--) {
			if (sandboxs[i].window == ev.currentTarget) {
				CU.evalInSandbox("if (typeof redirectBypasser != \"undefined\") {redirectBypasser.stop(true); redirectBypasser = undefined;}", sandboxs[i]);
				CU.nukeSandbox(sandboxs.splice(i, 1)[0]);
				break;
			}
		}
	}
	
	function onMessage(msgData, sendResponse) {
		switch (msgData.name) {
			case "opts.get":
				sendResponse(CU.cloneInto({
					PAGE_DATA: ((OPTS.scriptEnabled || msgData.force)? rb.PAGE_DATA : rb.PAGE_DATA_SIMPLE)
				}, msgData));
				break;
			case "target.process":
				var timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
				
				timer.initWithCallback(function() {
					sendResponse(CU.cloneInto(rb.linkProcess(msgData), msgData));
				}, 10, CI.nsITimer.TYPE_ONE_SHOT);
				break;
			case "tab.open":
				windowOpen(msgData);
				break;
			case "state.toggle":
				rb.PAGE_DATA.OPTS.scriptEnabled = OPTS.scriptEnabled = !OPTS.scriptEnabled;
				
				storageSet("opts", OPTS);
				updateContentScript();
				showNotification(OPTS.scriptEnabled);
				break;
			case "opts.set":
				if (msgData.opts) {
					rb.optsBuild(msgData.opts);
					storageSet("opts", OPTS);
				}
				
				var sitesrules = ((msgData.sitesrulesAction == "replace")
					? msgData.sitesrules
					: (storageGet("sitesrules") || JSON.parse(JSON.stringify(SITESRULES)))
				);
				
				if (msgData.sitesrulesAction == "merge") {
					msgData.sitesrules.rules.forEach(function(k) {
						sitesrules.rules.push(k);
					});
					
					msgData.sitesrules.ignore.forEach(function(k) {
						sitesrules.ignore.push(k);
					});
				}
				
				if (msgData.sitesrulesAction == "replace" || msgData.sitesrulesAction == "merge") {
					rb.sitesFilterRules(sitesrules);
					storageSet("sitesrules", sitesrules);
				}
				
				rb.sitesBuildRules((OPTS.replaceUrl)? sitesrules : null);
				updateContentScript();
				sendResponse();
				break;
			case "siterules.addform.getdata":
				sendResponse(CU.cloneInto(siteruleFormData, msgData));
				break;
			case "siterules.addform.show":
				siteruleFormData = msgData;
				
				windowOpen({url: "chrome://redirectbypasser/content/siterules.html"});
				break;
			case "notification.show":
				showNotification(msgData.scriptEnabled);
				break;
			default :
				sendResponse({});
				break;
		}
	}
	
	function showNotification(scriptEnabled) {
		var notify = CC["@mozilla.org/alerts-service;1"].getService(CI.nsIAlertsService);
		
		try {
			notify.showAlertNotification(
				"chrome://redirectbypasser/content/images/" + ((scriptEnabled)? "rb-icon48-enable.png" : "rb-icon48-disable.png"),
				"Redirect Bypasser",
				""
			);
		} catch (e) {}
	}
	
	function updateContentScript() {
		var code = "if (typeof redirectBypasser != \"undefined\") { redirectBypasser.stop(); redirectBypasser.start({PAGE_DATA: "
			+ JSON.stringify(rb.PAGE_DATA) + "});}";
		
		for (var i = sandboxs.length; i--; CU.evalInSandbox(code, sandboxs[i]));
	}
	
	function storageSet(storageName, storageData) {
		var pref = CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefService).getBranch("extensions.redirectbypasser.");
		
		if (pref.getPrefType(storageName) != pref.PREF_STRING) {
			pref.deleteBranch(storageName);
		}
		
		pref.setCharPref(storageName, JSON.stringify(storageData));
	}
	
	function storageGet(storageName) {
		var pref = CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefService).getBranch("extensions.redirectbypasser.");
		var storageData = null;
		
		if (pref.getPrefType(storageName) == pref.PREF_STRING) {
			try {
				storageData = JSON.parse(pref.getCharPref(storageName));
			} catch(e) {}
		}
		
		return storageData;
	}
}

function shutdown(shutdownData, shutdownReason) {
	rb.cleanUp && rb.cleanUp();
	rb = null;
	
	if (shutdownReason == ADDON_DISABLE) {
		//debug
		//CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService).notifyObservers(null, "startupcache-invalidate", null);
	}
}

function install(installData, installReason) {}

function uninstall(uninstallData, uninstallReason) {
	if (uninstallReason == ADDON_UNINSTALL) {
		CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefService).getBranch("extensions.redirectbypasser.")
		.deleteBranch("extensions.redirectbypasser.");
	}
}
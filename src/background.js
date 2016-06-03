(function() {
"use strict";
var siteruleFormData = {};

function runtimeOnMessage(msgData, msgSender, sendResponse) {
	switch (msgData.name) {
		case "opts.get":
			sendResponse({PAGE_DATA: ((OPTS.scriptEnabled || msgData.force)? rb.PAGE_DATA : rb.PAGE_DATA_SIMPLE )});
			break;
		case "target.process":
			sendResponse(rb.linkProcess(msgData));
			break;
		case "tab.open":
			msgData.openerTabId = msgSender.tab.id;
			msgData.index 		= msgSender.tab.index + 1;
			delete msgData.name;
			
			chrome.tabs.create(msgData);
			break;
		case "state.toggle":
			rb.PAGE_DATA.OPTS.scriptEnabled = OPTS.scriptEnabled = !OPTS.scriptEnabled;
			
			chrome.storage.local.set({"opts": OPTS});
			updateContentScript();
			showNotification(OPTS.scriptEnabled);
			break;
		case "opts.set":
			if (msgData.opts) {
				rb.optsBuild(msgData.opts);
				chrome.storage.local.set({"opts": OPTS});
			}
			
			chrome.storage.local.get("sitesrules", function(storageData) {
				var sitesrules = ((msgData.sitesrulesAction == "replace")
					? msgData.sitesrules
					: (storageData.sitesrules || JSON.parse(JSON.stringify(SITESRULES)))
				);
				
				if (msgData.sitesrulesAction == "merge") {
					msgData.sitesrules.rules.forEach(function(k) {
						sitesrules.rules.push(k);
					});
					msgData.sitesrules.ignore.forEach(function(k) {
						sitesrules.ignore.push(k);
					});
				}
				
				if ((msgData.sitesrulesAction == "replace") || (msgData.sitesrulesAction == "merge")) {
					rb.sitesFilterRules(sitesrules);
					chrome.storage.local.set({"sitesrules": sitesrules});
				}
				
				rb.sitesBuildRules((OPTS.replaceUrl)? sitesrules : null);
				updateContentScript();
				sendResponse();
			});
			return true;
		case "siterules.addform.getdata":
			sendResponse(siteruleFormData);
			break;
		case "siterules.addform.show":
			siteruleFormData = msgData;
			
			chrome.extension.getViews({type: "tab"}).forEach(function(win) {
				win.close();
			});
			chrome.tabs.create({
				url			: chrome.extension.getURL("siterules.html"),
				openerTabId	: msgSender.tab.id,
				index		: msgSender.tab.index + 1
			});
			break;
		case "notification.show":
			showNotification(msgData.scriptEnabled);
			break;
		default :
			sendResponse({});
			break;
	}
}

function updateContentScript() {
	var code = "if (typeof redirectBypasser != \"undefined\") {redirectBypasser.stop(); redirectBypasser.start({PAGE_DATA: "
		+ JSON.stringify(rb.PAGE_DATA)+ "});}";
	
	chrome.tabs.query({url: ["https://*/*", "http://*/*", "file://*/*"]}, function(tabs) {
		tabs.forEach(function(tab) {
			chrome.tabs.executeScript(tab.id, {code: code, allFrames: true, runAt: "document_start"}, function() {
				if (!chrome.runtime.lastError) {}
			});
		});
	});
}

function showNotification(scriptEnabled) {
	chrome.notifications.create("notf1", {
		type	: "basic",
		title	: "Redirect Bypasser",
		message	: chrome.i18n.getMessage((scriptEnabled)? "ON" : "OFF"),
		iconUrl	: ((scriptEnabled)? "images/rb-icon48-enable.png" : "images/rb-icon48-disable.png")
	});
}

chrome.runtime.onMessage.addListener(runtimeOnMessage);
chrome.storage.local.get(["opts", "sitesrules"], function(storageData) {
	var code = "if (typeof redirectBypasser != \"undefined\") {redirectBypasser.stop(true); redirectBypasser = undefined;}", delay = 0;
	
	rb.optsBuild(storageData.opts) && chrome.storage.local.set({"opts": OPTS});
	rb.sitesBuildRules((OPTS.replaceUrl)? (storageData.sitesrules || SITESRULES) : null);
	chrome.tabs.query({url: ["https://*/*", "http://*/*", "file://*/*"]}, function(tabs) {
		tabs.forEach(function(tab) {
			delay += 200;
			
			setTimeout(function(tabId) {
				chrome.tabs.executeScript(tabId, {code: code, allFrames: true, runAt: "document_idle"}, function() {
					if (!chrome.runtime.lastError) {}
					
					chrome.tabs.executeScript(tabId, {
						file: "/content-scripts/content.js",
						allFrames: true,
						runAt: "document_idle"
					}, function() {if (!chrome.runtime.lastError) {}});
				});
			}, delay, tab.id);
		});
	});
});

})();

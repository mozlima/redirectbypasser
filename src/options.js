"use strict";

var sendMessage = ((window.chrome && chrome.runtime)? chrome.runtime.sendMessage : sendMessage);

(function() {
t.availableLanguages = ["en", "pt_BR"];
t.load("en");
ce("link", "type", "text/css", "rel", "stylesheet", "href", "options.css?" + Date.now(), "media", "all", document.head);

function init(optsStored, sitesrulesStored) {
	if ((document.readyState != "interactive") && (document.readyState != "complete")) {
		return document.addEventListener("DOMContentLoaded", function() {
			init(optsStored, sitesrulesStored);
		}, false);
	}
	
	if (!sitesrulesStored || !sitesrulesStored.rules || !sitesrulesStored.ignore) {
		sitesrulesStored = rb.SITES_RULES_DEFAULT;
	}
	
	var OPTS_DEFAULT = JSON.parse(JSON.stringify(OPTS));
	var handleKeyList = {};
	var handleKeyTimer = 0;
	var testArea = document.getElementById("test-area");
	
	testArea.setAttribute("data-attribute-1", "http://www.example.com/test.avi");
	testArea.setAttribute("data-attribute-2", "http://www.example.com/test.jpg?url=http://www.example.com/test.zip");
	testArea.addEventListener("click", function(ev) {
		ev.preventDefault();
	}, true);
	testArea.href = "http://www.example.com/test/?url1=http://www.example.com/1&url2=http://www.example.com/t.jpg&url3=http://www.example.com/t.mp3&aHR0cDovL3d3dy5leGFtcGxlLmNvbS9iYXNlNjQ=&687474703A2F2F7777772E6578616D706C652E636F6D2F686578";
	
	var _sendMessage = sendMessage;
	
	sendMessage = function(data, sendResponse) {
		if (data.name == "opts.get") {
			sendResponse({PAGE_DATA: rb.PAGE_DATA});
			
		} else if (data.name == "target.process") {
			sendResponse(rb.linkProcess(data));
			
		} else if (data.name == "state.toggle") {
			rb.PAGE_DATA.OPTS.scriptEnabled = OPTS.scriptEnabled = !OPTS.scriptEnabled;
			_sendMessage({name: "notification.show", scriptEnabled: OPTS.scriptEnabled});
			
		} else if (data.name == "siterules.show.form") {
		} else {
			_sendMessage.apply(_sendMessage, arguments);
		}
	}
	
	var eventActions = {
		"click": {
			"siterule.add": function(ev, name, val, focused, chkd) {
				siteruleAdd([["*://example.org*"] , ["*.html"]]);
			},
			"siterule.add.default": function(ev) {
				rb.SITES_RULES_DEFAULT.rules.forEach(siteruleAdd);
				rb.SITES_RULES_DEFAULT.ignore.forEach(function(key) {
					addItem("siterule-ignore-pattern").value = key;
				});
			},
			"item.clone": function(ev, name, val, focused, chkd) {
				addItem(name);
			},
			"form.action": function(ev, type) {
				if (type == "reset") {
					sendMessage({name: "opts.set", opts : OPTS_DEFAULT}, function() {
						window.location.reload();
					});
				} else {
					var data = getFormData();
					
					sendMessage({name: "opts.set", opts: data.opts, sitesrules: data.sitesrules, sitesrulesAction: "replace"}, function() {
						window.location.reload();
					});
				}
			}
		},
		"change": {
			"menu.behavior.change": function(ev) {
				document.querySelector("select[name=\"useFallbackRule\"]").disabled = !+ev.target.value;
			},
			"language.switch": function(ev) {
				t.load(ev.target.value, function() {
					t.node(document);
				});
			}
		}
	}
	
	t.availableLanguages.sort().forEach(function(key) {
		this.options.add(new Option(key.replace("_", " "), key));
	}, document.getElementById("select-language"));
	
	rb.optsBuild(optsStored);
	rb.sitesBuildRules(sitesrulesStored);
	
	Object.keys(OPTS).forEach(function(key) {
		q("input[name='" + key + "'], select[name='" + key + "']").forEach(function(el) {
			if (el.hasAttribute("data-keyboard-keys")) {
				el.value = convertkeys(OPTS[key].split(","));
				el.setAttribute("data-keyboard-keys", OPTS[key]);
				el.addEventListener("keyup", function(ev) {
					clearTimeout(handleKeyTimer);
					handleKeyTimer = setTimeout(handleKey, 300, ev.target);
					handleKeyList[ev.key || ev.keyIdentifier] = 0;
				}, false);
				
				el.addEventListener("keydown", function(ev) {
					setTimeout(function() {
						ev.target.value = ((ev.target.value[0] == ".")? " . . . " : ". . . .");
					},10);
				}, false);
				
				el.addEventListener("input", function(ev) {
					ev.target.value = convertkeys(ev.target.getAttribute("data-keyboard-keys").split(","));
				}, false);
				
			} else if (el.getAttribute("type") == "radio" ) {
				el.checked = (el.value == OPTS[key]);
			} else {
				el.checked = OPTS[key];
				el.value = OPTS[key];
			}
		});
	});
	
	OPTS.allowedProtocols.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("protocol-item").value = key.replace(/\\(.)/g, "$1"));
	});
	OPTS.extOrder.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("extorder-item").value = key.replace(/\\(.)/g, "$1"));
	});
	OPTS.excludedAttr.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("excludedattr-item").value = key.replace(/\\(.)/g, "$1"));
	});
	sitesrulesStored.rules.forEach(siteruleAdd);
	sitesrulesStored.ignore.forEach(function(key) {
		addItem("siterule-ignore-pattern").value = key;
	});
	
	document.querySelector("select[name=\"useFallbackRule\"]").disabled = !+document.querySelector("select[name=\"replaceTargetUrl\"]").value;
	document.getElementById("about-version").textContent = OPTS_DEFAULT.version;
	
	t.load(OPTS.language, function() {
		t.node(document);
	});
	tabSelect(location.hash || "#general");
	document.body.addEventListener("input", handleEvents, true);
	document.body.addEventListener("click", handleEvents, true);
	document.body.addEventListener("change", handleEvents, true);
	document.addEventListener("change", updateScript, false);
	document.addEventListener("inputafterremove", updateScript, false);
	
	function handleEvents(ev) {
		var action = ev.target.getAttribute("data-evt-" + ev.type);
		
		if (action && eventActions[ev.type]) {
			var params = action.split("|");
			var fnc = params[0];
			params[0] = ev;
			
			if (eventActions[ev.type][fnc] && eventActions[ev.type][fnc].apply(eventActions, params)) {
				ev.preventDefault();
			}
		}
	}
	
	function siteruleAdd(rule) {
		var siterules	= document.getElementById("siterules");
		var siterule	= ce("div", "class", "siterule", siterules);
		var divPatterns	= ce("div", siterule);
		var divParams	= ce("div", siterule);
		var divAction	= ce("div", siterule);
		var inpPattern	= ce("input", "type", "text", "value", "*://example.org*", "class", "siterule-rule-pattern", "data-removable", "true");
		var inpParam	= ce("input", "type", "text", "value", "*.html", "class", "siterule-rule-param", "data-removable", "true", "data-movable", "siterule-rule-param");
		
		var bt1 = ce("button", "type", "button", "class", "icon green", divPatterns);
		bt1.addEventListener("click", function() {
			divPatterns.insertBefore(inpPattern.cloneNode(), this).focus();
		}, true);
		bt1.textContent = "\u002B";
		
		var bt2 = ce("button", "type", "button", "class", "icon green", divParams);
		bt2.addEventListener("click", function() {
			divParams.insertBefore(inpParam.cloneNode(), this).focus();
		}, true);
		bt2.textContent = "\u002B";
		
		var bt3 = ce("button", "type", "button", "class", "icon", divAction);
		bt3.addEventListener("click", function() {
			siterule.parentNode.removeChild(siterule);
		}, true);
		bt3.textContent = "\u00D7";
		
		var bt4 = ce("button", "type", "button", "class", "icon", divAction);
		bt4.addEventListener("click", function() {
			siterule.previousElementSibling && siterule.parentNode.insertBefore(siterule, siterule.previousElementSibling);
			fadein(siterule);
		}, true);
		bt4.textContent = "\u2191";
		
		var bt5 = ce("button", "type", "button", "class", "icon", divAction);
		bt5.addEventListener("click", function() {
			siterule.nextElementSibling && siterule.parentNode.insertBefore(siterule.nextElementSibling, siterule);
			fadein(siterule);
		}, true);
		bt5.textContent = "\u2193";
		
		rule[0].forEach(function(pattern) {
			divPatterns.insertBefore(inpPattern.cloneNode(), divPatterns.lastElementChild).value = pattern;
		});
		
		rule[1].forEach(function(param) {
			divParams.insertBefore(inpParam.cloneNode(), divParams.lastElementChild).value = param;
		});
		
		fadein(siterule);
	}
	
	function convertkeys(keys) {
		keys.forEach(function(k, i) {
			keys[i] = ((k[1] == "+")? String.fromCharCode(parseInt(k.substr(2), 16)) : k);
		});
		
		return keys.sort(function(a, b) {return  b.length - a.length;}).join(" + ").toUpperCase();
	}
	
	function handleKey(target) {
		var akeys = Object.keys(handleKeyList);
		var skeys = akeys.sort().join(",").toUpperCase();
		
		if (/U\+0008|BACKSPACE/.test(skeys)) {
			akeys = [];
			skeys = "";
		}
		
		target.setAttribute("data-keyboard-keys", skeys);
		target.value = convertkeys(akeys);
		handleKeyList = {};
	}
	
	function getFormData() {
		var sitesrules =  {ignore: [], rules: []};
		var optsNew = JSON.parse(JSON.stringify(OPTS));
		
		Object.keys(optsNew).forEach(function(key) {
			q("input[name=\"" + key + "\"], select[name=\"" + key + "\"]").forEach(function(el) {
				if (el.hasAttribute("data-keyboard-keys")) {
					optsNew[key] = el.getAttribute("data-keyboard-keys");
				} else if ((el.type != "radio") || el.checked) {
					optsNew[key] = ((el.type == "checkbox")? el.checked : ((typeof optsNew[key] == "number")? +el.value : el.value));
				}
			});
		});
		
		optsNew.scriptEnabled		= OPTS.scriptEnabled;
		
		optsNew.allowedProtocols 	= getNodeListValues("input.protocol-item", null, null, function(el) {
			return el.value.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		}).join("|");
		
		optsNew.excludedAttr 		= getNodeListValues("input.excludedattr-item", null, null, function(el) {
			return el.value.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		}).join("|");
		
		optsNew.extOrder 			= getNodeListValues("input.extorder-item", null, null, function(el) {
			return el.value.trim().replace(/\*|\.|\s/g, "").replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		}).join("|");
		
		q("div.siterule").forEach(function(siterule) {
			var rule = [getNodeListValues("input.siterule-rule-pattern", null, siterule), getNodeListValues("input.siterule-rule-param", null, siterule)];
			(rule[0].length && rule[1].length) && sitesrules.rules.push(rule);
		});
		getNodeListValues("input.siterule-ignore-pattern", sitesrules.ignore);
		rb.sitesFilterRules(sitesrules);
		
		return {opts: optsNew, sitesrules: sitesrules};
	}
	
	function updateScript() {
		var data = getFormData();
		rb.optsBuild(data.opts);
		rb.sitesBuildRules(data.sitesrules);
		redirectBypasser.stop(true);
		redirectBypasser.start({PAGE_DATA : rb.PAGE_DATA});
	}
}

if (window.chrome && chrome.storage) {
	chrome.storage.local.get(["opts", "sitesrules"], function(storageData) {
		setTimeout(init, 10, storageData.opts, storageData.sitesrules);
	});
	
	chrome.runtime.onMessage.addListener(function(msgData) {
		if (msgData.name == "showNotification") {
			redirectBypasser.showNotification(msgData.scriptEnabled);
		}
	});
	
} else {
	var optsStored, sitesrulesStored;
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.redirectbypasser.");
	
	if (pref.getPrefType("opts") == pref.PREF_STRING) {
		try {
			optsStored = JSON.parse(pref.getCharPref("opts"));
		} catch(e) {}
	}
	
	if (pref.getPrefType("sitesrules") == pref.PREF_STRING) {
		try {
			sitesrulesStored = JSON.parse(pref.getCharPref("sitesrules"));
		} catch(e) {}
	}
	
	windowList(function(win) {
		((win.location.href.indexOf("chrome://redirectbypasser/content/") === 0) && (win !== window)) && win.close();
	});
	
	init(optsStored, sitesrulesStored);
}

})();
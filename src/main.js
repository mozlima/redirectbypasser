"use strict";

if (!CSS.escape) {
	CSS.escape = function(s) {
		return s.replace(/[~!@$%^&*\(\)+=,./';:"?><\[\]\\\{\}|`#]/g, "\\$&");
	}
}

if (!RegExp.escape) {
	RegExp.escape = function(s) {
		return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
}

function t(w) {
	if ((t.language in t.languages) && (w in t.languages[t.language])) {
		return t.languages[t.language][w]["message"];
		
	} else if (("en" in t.languages) && (w in t.languages["en"])) {
		return t.languages["en"][w]["message"];
	}
	
	return t.missing(w);
}

t.availableLanguages = [];
t.language = "en";
t.languages = {};
t.missing = function(w) {
	return "-" + w;
}
t.load = function (lng, callback) {
	if (!t.availableLanguages.length 
		&& (typeof chrome != undefined)
		&& chrome.runtime
		&& chrome.runtime.getPackageDirectoryEntry
	) {
		chrome.runtime.getPackageDirectoryEntry(function(fs) {
			fs.getDirectory("_locales", {create: false}, function(dir) {
				var dr = dir.createReader();
				var rd = function(entries) {
					var i = entries.length;
					
					while (i--) {
						if (entries[i].isDirectory) {
							t.availableLanguages.push(entries[i].name);
						}
					}
					
					if (!entries.length) {
						return t.load(lng, callback);
					}
					
					dr.readEntries(rd);
				}
				
				dr.readEntries(rd);
			});
		});
		
		return t;
	}
	
	if (!lng || lng == "auto" || t.availableLanguages.indexOf(lng) == -1) {
		lng = navigator.language.replace("-", "_");
		
		if (t.availableLanguages.indexOf(lng) == -1) {
			lng = lng.split("_")[0];
			lng = ((t.availableLanguages.indexOf(lng) == -1)? "en" : lng);
		}
	}
	
	t.language = lng;
	
	if (t.languages[lng]) {
		callback && callback();
		
	} else {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "_locales/" + lng + "/messages.json", true);
		xhr.overrideMimeType("application/json");
		xhr.addEventListener("loadend", function() {
			if (this.response) {
				t.languages[lng] = this.response;
				callback && callback();
			}
		});
		xhr.addEventListener("error", function(ev) {
			alert("Failed to load language : " + lng);
			!("en" in t.languages) && t.load("en", callback);
		});
		xhr.responseType = "json";
		xhr.send();
	}
	
	return t;
}
t.node = function (target) {
	var nodes = document.evaluate(
		"descendant-or-self::*[@data-lang or @*[contains(name(), 'data-lang-')]]",
		(target || document),
		null,
		XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
		null
	);
	
	for (var i = 0, node; node = nodes.snapshotItem(i); i++) {
		var atts = document.evaluate(
			"@data-lang | @*[starts-with(name(), 'data-lang-')]",
			node,
			null,
			XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
		
		for (var ii = 0, att, attn; att = atts.snapshotItem(ii); ii++) {
			if (att.name == "data-lang") {
				node.textContent = t(att.value);
				
			} else {
				node.setAttribute(att.name.substr(10), t(att.value));
			}
		}
	}
	
	return t;
}

function ce() {
	var a = arguments, e = document.createElement(a[0]), l = a.length;
	
	for (var i = 1, c = l + ~l % 2; i < c; i += 2) {
		e.setAttribute(a[i], a[i + 1]);
	}
	
	return ((!(l % 2) && a[l - 1].appendChild(e)) || e);
}

function q(s, t) {
	return Array.prototype.slice.call((t || document).querySelectorAll(s));
}

function tabSelect(id) {
	var tab = document.getElementById(id.replace("#", ""));
	
	if (tab) {
		var xpath = document.evaluate(
			"//div[@id='" + tab.id
			+ "']/ancestor-or-self::*[contains(concat(' ', @class, ' '), ' tab ')]/../div[contains(concat(' ', @class, ' '), ' tab ')]",
			document,
			null,
			XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
		
		for (var i = 0, isDescendant  = false, el; el = xpath.snapshotItem(i); i++) {
			isDescendant = el.contains(tab);
			el.classList[((isDescendant)? "add" : "remove")]("tab-selected");
			
			if (el.id) {
				var nodes = document.querySelectorAll("a[href$=\"#" + CSS.escape(el.id) + "\"]" + ((isDescendant)? "" : ".tab-selected" ));
				
				for (var ii = 0, el2; el2 = nodes[ii]; ii++ ) {
					el2.classList[((isDescendant)? "add" : "remove")]("tab-selected");
				}
			}
		}
		
		return true;
	}
	
	return false;
}

var mlWatcher = new function() {
	var self = this, loaded = {}, timer = 0, callbacks = [], ids = [];
	
	var onLoaded = function(id) {
		if (id) {
			ids.push(id);
			clearTimeout(timer);
			timer = setTimeout(onLoaded, 20);
			return;
		}
		
		var i = ids.length;
		
		while (i--) {
			var ii = callbacks.length, idx = 0;
			
			while (ii--) {
				idx = callbacks[ii].indexOf(ids[i]);
				
				if (idx != -1) {
					callbacks[ii].splice(idx, 1);
					
					if (callbacks[ii].length == 1) {
						callbacks[ii][0]();
						callbacks.splice(ii, 1);
					}
				}
			}
		}
		
		ids.length = 0;
	}
	
	this.setItem = function(id, v) {
		loaded[id] = +v;
		onLoaded(id);
	}
	
	this.getItem = function(id) {
		return ((loaded[id] == undefined)? -1 : loaded[id]);
	}
	
	this.onItemsDone = function() {
		var args = [];
		
		for (var i = 0, l = arguments.length - 1; i < l; i++) {
			if (self.getItem(arguments[i]) == -1) {
				args.push(arguments[i]);
			} 
		}
		
		if (args.length) {
			callbacks.push([arguments[arguments.length - 1]].concat(args));
			
		} else {
			arguments[arguments.length - 1]();
		}
	}
	
	this.watchLoad = function(obj, id) {
		if (loaded[id] == undefined) {
			var watchLoad = function(ev) {
				obj.removeEventListener(ev.type, watchLoad, true);
				self.setItem(id, +(ev.type == "load" || ev.type == "DOMContentLoaded"));
			}
			loaded[t] = -1;
			
			if (obj instanceof HTMLDocument) {
				if ((obj.readyState != "interactive") && (obj.readyState != "complete")) {
					obj.addEventListener("DOMContentLoaded", watchLoad, true);
					
				} else {
					mlWatcher.setItem("DOMContentLoaded", 1);
				}
				
			} else if (obj instanceof Window || obj instanceof XMLHttpRequest || obj instanceof HTMLElement) {
				obj.addEventListener("load", watchLoad, true);
				!(obj instanceof Window) && obj.addEventListener("error", watchLoad, true);
			}
		}
		
		return obj;
	}
}

function addItem(id) {
	var tpl = document.getElementById("tpl-" + id);
	var el = document.importNode(tpl.content.firstElementChild, true);
	var gid = Math.random().toString(36).substr(2, 9);
	var atts = document.evaluate("descendant-or-self::*/@*[contains(., \"\!ID!\")]", el, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	
	for (var i = 0, att, attn; att = atts.snapshotItem(i); i++ ) {
		att.value = att.value.replace(/!ID!/g, gid);
	}
	
	tpl.parentNode.insertBefore(el, tpl);
	return el;
}

function getNodeListValues(selector, arrayRef, target, preF) {
	var values = [];
	var arr = q(selector, target).filter(function(item, pos, arr) {
		var val = ((typeof preF == "function")? preF(item) : item.value);
		if ((val.length && (arr.indexOf(item) == pos) && (!arrayRef || (arrayRef.indexOf(val) == -1)))) {
			values.push(val);
			arrayRef && arrayRef.push(val);
			return true;
		}
		
		return false;
	});
	
	return values;
}

function fadein(el) {
	el.classList.add("fadein");
	setTimeout(function() {
		el.classList.remove("fadein");
	}, 1100);
}

window.addEventListener("click", function(ev) {
	ev.target.hash && setTimeout(function(x, y){window.scroll(x, y);}, 100, window.scrollX, window.scrollY);
}, true);

window.addEventListener("hashchange", function(ev) {
	tabSelect(location.hash);
	ev.preventDefault();
	ev.stopPropagation();
}, true);

window.addEventListener("load", function() {
	var eventTarget, dragSrcEl, dragTargetEl;
	var uiStyle		= ce("style");
	var uiImgMove	= ce("img", "src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAKFJREFUOI29k9ENwyAMRH3tLmSNLGDDRiUbNckC6RhhGfcLiVJiUkXq/YHunvABRIaYfWT20fLcrTCAB4DRuQEp7dtpQA7ndQ9yKJGgIkEtz+0nogXolVXqy8vsY++opUSCZgjqwrKW5Yk6VHtUdbrcARFdG+ED0jK2wKcL/8s7QGuzdTOqOq3rHGtv8y+ktG/ODQAwWuFDQAkhotdRmIjoDUwkT9iVjrbcAAAAAElFTkSuQmCC", "style", "position: absolute;z-index: 2000;width:auto;padding:2px;box-sizing: border-box;cursor:move;display:none;");
	var uiImgClose	= ce("img", "src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMBJREFUeNqkU9ENhCAMBSdxBG8H2AMmO/bgywl0A92Ea72SlFrxcjZpKuG9+igPW0oxT2LgC+/9dEcAzKg2gI0AZYH67pARs1E9wuIR6M8Lw6acc1TIvPkLMOuhAD+QxDYDV6KQE3G+ChgQQYEDIWeFHJsjCKmyiekdbZAIAqRfyGoDivkvH1wMTB3slZFO0+7djmak07SVmTRNqpHQntuNkeTtNEbaocTetIWSWI1kUEFN59zE11pKjH36nD8CDACsIpgfdd3pqwAAAABJRU5ErkJggg==", "style", "position: absolute;z-index: 2000;width:auto;padding:2px;box-sizing: border-box;cursor:pointer;display:none;");
	
	uiStyle.textContent = "\
		/* removable */\
		input[type=\"text\"][data-removable=\"true\"] {\
			padding: 0px 1.8em 0px 2px;\
		}\
		/* movable or checkable */\
		input[type=\"text\"][data-movable],\
		input[type=\"text\"][data-checkable] {\
			padding: 0px 2px 0px 1.8em;\
		}\
		/* movable & checkable & removable */\
		input[type=\"text\"][data-removable=\"true\"][data-movable][data-checkable] {\
			padding: 0px 1.8em 0px 3.6em;\
		}\
		/* removable & checkable or removable & checkable */\
		input[type=\"text\"][data-removable=\"true\"][data-movable],\
		input[type=\"text\"][data-removable=\"true\"][data-checkable] {\
			padding: 0px 1.8em 0px 1.8em;\
		}\
		/* movable & checkable */\
		input[type=\"text\"][data-movable][data-checkable] {\
			padding: 0px 2px 0px 3.6em;\
		}\
		input[type=\"text\"][data-checkable] {\
			background-repeat: no-repeat;\
			background-color: transparent;\
			background-size: 1em;\
			background-image: url(\"images/input-unchecked.png\");\
			background-position: 2px center;\
		}\
		input[type=\"text\"][data-checkable][data-checked=\"true\"] {\
			background-image: url(\"images/input-checked.png\");\
		}\
		html.ml-drag * {\
			cursor: move !important;\
		}\
		html.ml-drag1 *:not([data-movable]) {\
			cursor: no-drop !important;\
		}\
		input.ml-drag-source {\
			opacity: 0.25;\
			visibility:hidden;\
			cursor: move !important;\
		}\
		input.ml-drag-target-before,\
		input.ml-drag-target-after {\
			opacity: 0.5;\
			cursor: alias !important;\
		}\
		input.ml-drag-target-before {\
			box-shadow:-4px 0px 3px -2px black;\
		}\
		input.ml-drag-target-after {\
			box-shadow: 4px 0px 3px -2px black;\
		}\
		input[data-movable-vertical].ml-drag-target-before {\
			box-shadow: 0px -4px 3px -2px black;\
		}\
		input[data-movable-vertical].ml-drag-target-after {\
			box-shadow: 0px 4px 3px -2px black;\
		}\
		.ml-fadein {\
			animation: ml-fade-in 2000ms;\
		}\
		@keyframes ml-fade-in {\
			0%  {\
				opacity: 0;\
			}\
			100%  {\
				opacity: 1;\
			}\
		}\
	";
	
	document.documentElement.insertBefore(uiStyle, document.documentElement.firstChild);
	document.documentElement.insertBefore(uiImgMove, document.documentElement.firstChild);
	document.documentElement.insertBefore(uiImgClose, document.documentElement.firstChild);
	
	function fadein(el) {
		el.classList.add("ml-fadein");
		setTimeout(function() {
			el.classList.remove("ml-fadein");
		}, 2100);
	}
	
	var uiImgMoveOnmousedown = function(ev) {
		if (eventTarget && eventTarget.hasAttribute("data-movable")) {
			dragSrcEl = eventTarget;
			dragSrcEl.classList.add("ml-drag-source");
			document.addEventListener("mouseup", documentOnmouseup, true);
			document.addEventListener("mousemove", documentOnmousemove, true);
			ev.preventDefault();
			ev.stopPropagation();
		}
	}

	var documentOnmouseup = function(ev) {
		if (dragTargetEl && (ev.target.getAttribute("data-movable") == dragSrcEl.getAttribute("data-movable"))) {
			dragSrcEl.parentNode.removeChild(dragSrcEl);
			dragTargetEl.parentNode.insertBefore(dragSrcEl , ((dragTargetEl.classList.contains("ml-drag-target-before"))? dragTargetEl : dragTargetEl.nextElementSibling));
			fadein(dragSrcEl);
		}
		
		document.documentElement.classList.remove("ml-drag");
		dragSrcEl && dragSrcEl.classList.remove("ml-drag-source");
		dragTargetEl && dragTargetEl.classList.remove("ml-drag-target-before", "ml-drag-target-after");
		dragSrcEl = null;
		dragTargetEl = null;
		ev.currentTarget.removeEventListener("mouseup", documentOnmouseup, true);
		ev.currentTarget.removeEventListener("mousemove", documentOnmousemove, true);
	}
	
	var documentOnmousemove = function(ev) {
		if (dragSrcEl && (ev.target !== dragSrcEl)) {
			dragTargetEl && dragTargetEl.classList.remove("ml-drag-target-before", "ml-drag-target-after");
			
			if (ev.target.getAttribute("data-movable") == dragSrcEl.getAttribute("data-movable")) {
				dragTargetEl = ev.target;
				if (ev.target.hasAttribute("data-movable-vertical")) {
					dragTargetEl.classList.add(((((ev.offsetY || ev.layerY) / dragTargetEl.offsetHeight) < 0.5)? "ml-drag-target-before" : "ml-drag-target-after"));
				} else {
					dragTargetEl.classList.add(((((ev.offsetX || ev.layerX) / dragTargetEl.offsetWidth) < 0.5)? "ml-drag-target-before" : "ml-drag-target-after"));
				}
			}
			
			document.documentElement.classList.add("ml-drag");
			dragSrcEl && dragSrcEl.blur();
			ev.preventDefault();
			ev.stopPropagation();
		}
	}
	
	var fieldOnMouseOver = function(ev) {
		uiImgMove.style.display = "none";
		uiImgClose.style.display = "none";
		
		if (!dragSrcEl) {
			var rect = ev.target.getBoundingClientRect();
			var isRemovable = (ev.target.getAttribute("data-removable") == "true");
			var movableId = ev.target.getAttribute("data-movable");
			var checkableId = ev.target.getAttribute("data-checkable");
			
			eventTarget = ev.target;
			
			if (isRemovable) {
				uiImgClose.style.top = (window.pageYOffset + rect.top) + "px";
				uiImgClose.style.left = (window.pageXOffset + rect.right - rect.height) + "px";
				uiImgClose.style.height = rect.height + "px";
				uiImgClose.style.display = "initial";
			}
			
			if (movableId) {
				uiImgMove.style.top = (window.pageYOffset + rect.top) + "px";
				uiImgMove.style.left = (window.pageXOffset + rect.left + ((checkableId)? rect.height : 0)) + "px";
				uiImgMove.style.height = rect.height + "px";
				uiImgMove.style.display = "initial";
			}
		}
	}
	
	var fieldOnMouseOut = function(ev) {
		if (ev.relatedTarget && (ev.relatedTarget !== uiImgMove && ev.relatedTarget !== uiImgClose)) {
			uiImgMove.style.display = "none";
			uiImgClose.style.display = "none";
		}
	}
	
	var fieldOnClick = function(ev) {
		if (ev.target.hasAttribute("data-checkable")) {
			var tgt = ev.target;
			var style = window.getComputedStyle(tgt);
			var lx = (ev.offsetX || ev.layerX);
			
			if (((tgt.type == "radio") || (tgt.type == "checkbox")) || ((parseInt(style.height, 10) > lx) && lx < tgt.offsetWidth)) {
				if (tgt.hasAttribute("data-checkable-multiple")) {
					tgt.setAttribute("data-checked", ((tgt.getAttribute("data-checked") == "true")? "false" : "true"));
				} else {
					var els = document.querySelectorAll("[data-checkable=\"" + CSS.escape(tgt.getAttribute("data-checkable")) + "\"]:not([data-checkable-multiple])");
					
					for(var i = 0, l = els.length; i < l; i++) {
						els[i].removeAttribute("data-checked");
						els[i].checked = false;
					}
					
					tgt.setAttribute("data-checked", "true");
					tgt.checked = true;
					
					var evt = new Event("change", {"bubbles": true, "cancelable": true});
					tgt.dispatchEvent(evt);
				}
			}
		}
	}
	
	var fieldOnMouseMove = function(ev) {
		var style = window.getComputedStyle(this);
		this.style.cursor = ((parseInt(style.height, 10) > (ev.offsetX || ev.layerX))? "pointer" : "initial");
	}
	
	uiImgClose.addEventListener("mouseout", fieldOnMouseOut, false);
	uiImgClose.addEventListener("click", function() {
		if (eventTarget) {
			var evt = new CustomEvent("inputremove", {bubbles: true, cancelable: true});
			
			if (eventTarget.dispatchEvent(evt)) {
				eventTarget.parentNode.removeChild(eventTarget);
				uiImgMove.style.display = "none";
				uiImgClose.style.display = "none";
				eventTarget = null;
			}
			
			var evt = new CustomEvent("inputafterremove", {bubbles: true, cancelable: false});
			document.dispatchEvent(evt);
		}
	}, true);
	uiImgMove.addEventListener("mouseout", fieldOnMouseOut, false);
	uiImgMove.addEventListener("mousedown", uiImgMoveOnmousedown, true);
	
	var removableInputHook = function(field) {
		if ((field.nodeName.toUpperCase() == "INPUT") && (field.nodeType == field.ELEMENT_NODE)) {
			var isRemovable = (field.getAttribute("data-removable") == "true");
			var movableId = field.getAttribute("data-movable");
			var checkableId = field.getAttribute("data-checkable");
			
			field[(checkableId)? "addEventListener" : "removeEventListener"]("click", fieldOnClick, false);
			
			if (field.type == "text") {
				field[(isRemovable || movableId || checkableId)? "addEventListener" : "removeEventListener"]("mousemove", fieldOnMouseMove, false);
				field[(isRemovable || movableId || checkableId)? "addEventListener" : "removeEventListener"]("mouseover", fieldOnMouseOver, false);
				field[(isRemovable || movableId || checkableId)? "addEventListener" : "removeEventListener"]("focus", fieldOnMouseOver, false);
				field[(isRemovable || movableId || checkableId)? "addEventListener" : "removeEventListener"]("mouseout", fieldOnMouseOut, false);
				field[(isRemovable || movableId || checkableId)? "addEventListener" : "removeEventListener"]("blur", fieldOnMouseOut, false);
			}
		} else if (field.querySelectorAll) {
			var els = field.querySelectorAll("input[type=\"text\"][data-removable=\"true\"], [data-movable], [data-checkable]");
			for(var i = 0, l = els.length; i < l; i++) {
				removableInputHook(els[i]);
			}
		}
	}
	
	var observer = new MutationObserver(function(ms) {
		for (var i = 0; i < ms.length; i++) {
			if (ms[i].type == "attributes") {
				removableInputHook(ms[i].target);
			} else {
				for (var j = 0; j < ms[i].addedNodes.length; j++) {
					removableInputHook(ms[i].addedNodes[j]);
				}
			}
		}
	});
	
	observer.observe(window.document.body || window.document.documentElement, {
		subtree: true ,
		attributes: false,
		childList: true,
		characterData: false,
		attributeOldValue: false,
		characterDataOldValue: false
	});
	
	var els = document.querySelectorAll("input[type=\"text\"][data-removable=\"true\"], [data-movable], [data-checkable]");
	
	for(var i = 0, l = els.length; i < l; i++) {
		removableInputHook(els[i]);
	}
}, true);


var sendMessage = (((typeof(chrome) == "object") && ("runtime" in chrome) && ("sendMessage" in chrome.runtime))
	? chrome.runtime.sendMessage
	: sendMessage
);
var OPTS_DEFAULT = JSON.parse(JSON.stringify(OPTS));
var SITESRULES_DEFAULT = JSON.parse(JSON.stringify(SITESRULES));
t.availableLanguages = ["en", "fr", "pt_BR", "sr"];

mlWatcher.watchLoad(document, "DOMContentLoaded");

(function() {
	var initStorage = function(optsStored, sitesrulesStored) {
		SITESRULES = ((!!sitesrulesStored && typeof(sitesrulesStored) == "object")? sitesrulesStored : SITESRULES);
		
		rb.optsBuild(optsStored);
		rb.sitesBuildRules(SITESRULES);
		t.load("en", function() {
			t.load(OPTS.language, function() {
				mlWatcher.setItem("storage+translation", 1);
			});
		});
	}
	
	if ((typeof(chrome) == "object") && chrome.storage) {
		chrome.storage.local.get(["opts", "sitesrules"], function(storageData) {
			setTimeout(initStorage, 10, storageData.opts, storageData.sitesrules);
			//initStorage(storageData.opts || {}, storageData.sitesrules || {});
		});
		
	} else {
		var optsStored, sitesrulesStored;
		var pref = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.redirectbypasser.");
		
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
		
		initStorage(optsStored, sitesrulesStored);
	}
})();

mlWatcher.onItemsDone("storage+translation", "DOMContentLoaded", function() {
	var handleKeyList	= {};
	var handleKeyTimer	= 0;
	
	t.availableLanguages.sort().forEach(function(key) {
		this.options.add(new Option(key.replace("_", "-").toUpperCase(), key));
	}, document.getElementById("select-language"));
	
	Object.keys(OPTS).forEach(function(key) {
		q("input[name=\"" + CSS.escape(key) + "\"], select[name=\"" + CSS.escape(key) + "\"]").forEach(function(el) {
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
	
	document.getElementById("about-version").textContent = OPTS_DEFAULT.version;
	
	setTimeout(mlWatcher.setItem, 0, "resources", 1);
	
	function convertkeys(keys) {
		keys.forEach(function(k, i) {
			keys[i] = ((k[1] == "+")? String.fromCharCode(parseInt(k.substr(2), 16)) : k);
		});
		
		return keys.sort(function(a, b) {return  b.length - a.length;}).join(" + ").toUpperCase();
	}
	
	function handleKey(target) {
		var akeys = Object.keys(handleKeyList), skeys = akeys.sort().join(",").toUpperCase();
		
		if (/U\+0008|BACKSPACE/.test(skeys)) {
			akeys = [];
			skeys = "";
		}
		
		target.setAttribute("data-keyboard-keys", skeys);
		target.value = convertkeys(akeys);
		handleKeyList = {};
	}
});

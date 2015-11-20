function t(w) {
	return (t.languages[t.language] && t.languages[t.language][w] && t.languages[t.language][w]["message"]) || (t.languages["en"] && t.languages["en"][w] && t.languages["en"][w]["message"]) || "-" + w;
}
t.language = "en";
t.languages = {};
t.load = function (lng, callback) {
	if (!lng || lng == "auto") {
		lng = navigator.language;
		if (!(lng in t.availableLanguages)) {
			lng = lng.split(/[_\-]/)[0];
			lng = ((lng in t.availableLanguages)? lng : "en");
		}
	}
	
	t.language = lng = lng.replace("-", "_");
	
	if (t.languages[lng]) {
		callback && callback();
	} else {
		var dx = new XMLHttpRequest();
		dx.open("GET", "_locales/" + lng + "/messages.json", true);
		dx.overrideMimeType("application/json");
		dx.addEventListener("loadend", function() {
			if (dx.response) {
				t.languages[lng] = dx.response;
			}
			
			callback && callback();
		});
		dx.responseType = "json";
		dx.send();
	}
	
	return t;
}
t.node = function (target) {
	var nodes = document.evaluate("descendant-or-self::*[@*[contains(name(), 'data-lang')]]", (target || document), null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	
	for (var i = 0, node; node = nodes.snapshotItem(i); i++ ) {
		var atts = document.evaluate("@*[starts-with(name(), 'data-lang')]", node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
		
		for (var ii = 0, att, attn; att = atts.snapshotItem(ii); ii++ ) {
			attn = att.name.replace("data-lang-", "");
			if (attn == "text") {
				node.textContent = t(att.value);
			} else {
				node.setAttribute(attn, t(att.value));
			}
		}
	
	}
}

function ce() {
	var a = arguments, e = document.createElement(a[0]), l = a.length;
	
	for (var i = 1, c = l + ~l % 2; i < c; i += 2) {
		e.setAttribute(a[i], a[i + 1]);
	}
	
	return (!(l % 2) && a[l - 1].appendChild(e)) || e;
}

function q(s, t) {
	return Array.prototype.slice.call((t || document).querySelectorAll(s));
}

function tabSelect(id) {
	var tab = document.getElementById(id.substring(1));
	
	if (tab) {
		var cssPath = function(el) {
			var path = [];
			
			while ((el = el.parentNode) && el.nodeType === Node.ELEMENT_NODE) {
				path.push(el.nodeName.toLowerCase() + ((el.id)? "#" + el.id : "") + ((el.className)? "." + el.className.replace(/\s+/g, ".") : ""));
			}
			
			return path.reverse().join(" > ");
		}
		
		Array.prototype.forEach.call(document.querySelectorAll("a[href$=\"" + id + "\"]"), function(el) {
			Array.prototype.forEach.call(document.querySelectorAll(cssPath(el) + " > a.tab-selected"), function(el) {
				el.classList.remove("tab-selected");
			});
			el.classList.add("tab-selected");
		});
		
		Array.prototype.forEach.call(document.querySelectorAll(cssPath(tab) + " > " + tab.nodeName.toLowerCase() + "[id]"), function(el) {
			el.classList.remove("tab-selected");
		});
		
		tab.classList.add("tab-selected");
		
		var el = tab;
	
		while ((el = el.parentNode) && el.nodeType === Node.ELEMENT_NODE) {
			if (el.id) {
				tabSelect("#" + el.id);
				break;
			}
		}
	}
}

function addItem(id) {
	var tpl = document.getElementById("tpl-" + id);
	var el = document.importNode(tpl.content.firstElementChild);
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
	var arr = Array.prototype.slice.call((target || document).querySelectorAll(selector)).filter(function(item, pos, arr) {
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

window.addEventListener("hashchange", function(ev) {
	tabSelect(location.hash);
	ev.preventDefault();
	document.body.scrollTop = document.documentElement.scrollTop = 0;
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
					var els = document.querySelectorAll("[data-checkable=\"" + tgt.getAttribute("data-checkable") + "\"]:not([data-checkable-multiple])");
					
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

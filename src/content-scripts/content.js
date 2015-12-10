if (typeof redirectBypasser == "undefined") {
var sendMessage = ((window.chrome && chrome.runtime)? chrome.runtime.sendMessage : sendMessage);
var redirectBypasser = new function() {
	"use strict";
	var doc 					= window.document;
	var redirectBypasser 	 	= this;
	var OPTS 					= {};
	var REGEXPS 			 	= {};
	var targets 			 	= [];
	var targetsIDs 			 	= [];
	var targetsRects 		 	= [];
	var targetsHideTimers 	 	= [];
	var targetsShowTimers 	 	= [];
	var handleMouseTarget 	 	= null;
	var handleMousemoveTimer 	= 0;
	var handleMousemoveScroll	= -1;
	var handleKeyList 		 	= {};
	var handleKeyRaw 		 	= "";
	var handleKeyTimer 			= 0;
	var CX, CY;
	var extTest = [
		/\.(jpg|jpeg?|gif|png|bmp|ico|svg|svgz)$/i,
		/\.(mp3|wav|wma|ra|mid|m3u|asx|ogg)$/i,
		/\.(mov|mpg|avi|wmv|mpe|mpeg|rm|ram|rmvb|mp4|asf|flv|m4v|webm)$/i,
		/\.(torrent|zip|rar|tar|tgz|gz|bz2|tbz2|gzip|z|sit|dmg|cab|7z|lzh|pkg)$/i,
		/\.(txt|rtf|readme|xls|xlt|doc|dot|pps|odt|pdf)$/i,
		/\.(exe|pif|lnk|scr|msi|vb|vbs|vba|wsh|ref|cmd|bat|reg|app|sh|bin|ini)$/i,
		/.?/
	];
	var observerCallback = function(ms) {
		var i = ms.length;
		while (i--) {
			if (ms[i].type == "attributes") {
				nodeAdd(ms[i].target, true);
				
			} else if (ms[i].addedNodes.length > 0) {
				var j = ms[i].addedNodes.length;
				while (j--) {
					if (ms[i].addedNodes[j].nodeType == Node.ELEMENT_NODE) {
						nodeAdd(ms[i].addedNodes[j], true);
					}
				}
			}
		}
	}
	var observer			= new MutationObserver(observerCallback);
	var uiTarget, uiTimer 	= 0;
	var uiPopup 			= doc.createElement("div");
	var uiStyle 			= doc.createElement("style");
	var uiTooltip 			= uiPopup.appendChild(doc.createElement("div"));
	var uiMenulist 			= uiPopup.appendChild(doc.createElement("div"));
	
	uiPopup.id 				= "rb-div";
	uiTooltip.id 			= "rb-tooltip";
	uiMenulist.id 			= "rb-menulist";
	
	//FIXME: width/overflow
	uiPopup.addEventListener("mouseover", function(ev) {
		if (ev.target.nodeName == "A") {
			var el = ev.target, w = (684 / OPTS.tooltipFontSize) * 1.3;
			
			if (OPTS.tooltipShowIcon) {
				uiTooltip.style.setProperty("background-image", "url(" + el.origin + "/favicon.ico)", "important");
			}
			
			uiTooltip.innerHTML = doc.createTextNode(el.origin 
				+ ((el.pathname.length < w)? el.pathname : "/..." + el.pathname.slice(-w))
				+ ((el.pathname.length && el.search.length)? el.search.substr(0, w) : el.search.substr(0, w * 2))).textContent
				+ "<div style=\"height: 1.35em !important; font-size:1.3em !important; font-weight: bold !important;\">"
				+ doc.createTextNode(el.getAttribute("data-rb-tooltip")).textContent 
				+ "</div>";
			
			var rect = el.getBoundingClientRect();
			var left = el.offsetLeft - ((rect.left + uiTooltip.offsetWidth > window.innerWidth)? uiTooltip.offsetWidth - el.offsetWidth : 0 );
			uiTooltip.style.top = ((rect.top - uiTooltip.offsetHeight < 2)? uiPopup.offsetHeight : ~(uiTooltip.offsetHeight + -1)) + "px";
			uiTooltip.style.left =  ((left + uiPopup.offsetLeft > 1)? left : -uiPopup.offsetLeft) + "px";
			uiTooltip.style.visibility = "visible";
		}
	}, false);
	
	uiPopup.addEventListener("mouseout", function(ev) {
		uiTooltip.style.visibility = "hidden";
	}, false);
	
	uiPopup.addEventListener(((window.chrome && chrome.runtime) ? "click" : "mousedown"), function(ev) {
		if (ev.target.nodeName == "A") {
			if (handleKeyRaw == OPTS.keysPreventReferrer) {
				ev.target.setAttribute("rel", "noreferrer");
				
			} else if (handleKeyRaw == OPTS.keysOpenAsDownload) {
				ev.target.setAttribute("download", "");
				
			} else if (handleKeyRaw == OPTS.keysAddSiterule) {
				var links = JSON.parse(targets[targetsIDs.indexOf(ev.target.getAttribute("data-rb-target-id"))].getAttribute("data-rb-store") || "{}");
				links && links.base && sendMessage({
					name: "siterules.addform.show",
					url: links.base.url,
					info: ev.target.getAttribute("data-rb-tooltip").split(" \u2022 ").reverse(),
					links: links
				});
				targetsRemove();
				ev.preventDefault();
			}
			
			if (!ev.button && OPTS.openInNewPage == 2) {
				sendMessage({name: "tab.open", url: ev.target.href, active: false});
				ev.preventDefault();
			}
		}
		
		ev.stopPropagation();
	}, false);
	
	function uiShow(target, ccX, ccY) {
		if (target != uiTarget && !uiPopup.parentNode) {
			var rect = target.getBoundingClientRect();
			
			if (!(ccX < rect.left || ccX > rect.right || ccY < rect.top || ccY > rect.bottom)) {
				uiTarget = target;
				uiPopup.style.visibility = "hidden";
				uiPopup.style.display = "block";
				uiPopup.parentNode || doc.documentElement.insertBefore(uiPopup, doc.documentElement.firstChild);
				uiStyle.parentNode || doc.head.appendChild(uiStyle);
				
				var isPlugin = /embed|object|video|audio/i.test(target.nodeName), uPW = uiPopup.offsetWidth, uPH = uiPopup.offsetHeight;
				
				uiPopup.style.top = ((isPlugin || ((target.nodeName == "IMG")? (target.offsetHeight < 50) : (target.offsetHeight < 20))) ?
					rect.top + ((rect.top - uPH > -1) ? -uPH : ((rect.bottom + uPH < doc.documentElement.offsetHeight - window.pageYOffset) ? rect.height : 0))
					:
					ccY + ((ccY - uPH > -1) ? -uPH : ccY)
				) + window.pageYOffset + "px";
				uiPopup.style.left = ((isPlugin)? rect.left : (ccX + ((ccX + uPW + 5 < window.innerWidth)? 5 : ((ccX - uPW < -1)? -ccX :-uPW)))) + window.pageXOffset + "px";
				uiPopup.style.visibility = "visible";
			}
		}
	}
	
	function uiAddItems(links, target) {
		uiPopup.style.display = "none";
		OPTS.highlightLink && target.setAttribute("rb-hl", "");
		clearTimeout(uiTimer);
		
		for (var i = 0, link; link = links.list[links.index[i]]; i++) {
			if (!(/^(javascript|data)/i).test(link.url) && !uiMenulist.querySelector("a[data-rb-link-id=\"" + encodeURIComponent(link.url) + "\"]")) {
				var menuItem = doc.createElement("a");
				menuItem.href = link.url;
				menuItem.setAttribute("data-rb-link-id", encodeURIComponent(link.url));
				menuItem.setAttribute("data-rb-target-id", links.targetID);
				menuItem.setAttribute("data-rb-tooltip", link.info.reverse().join(" \u2022 "));
				OPTS.openInNewPage && menuItem.setAttribute("target", "_blank");
				
				extTest.some(function(key, idx) {
					if (key.test(menuItem.pathname)) {
						var sa = (link.info.join("")).split("").sort(), i = sa.length, ch = 0, cs = 0, cl = 0, mw = (((i)? sa[i - 1].charCodeAt(0) - sa[0].charCodeAt(0) : 0) || 1);
						
						for (var cc; i--; cc = sa[i].charCodeAt(0), ch += cc, cs += ((i % 2)? cc : 0), cl += ((i % 2)? 0 : cc));
						
						var hue = parseInt(((((ch % mw) / mw * 100) + (idx / extTest.length * 100)) % 100) * 3.6, 10);
						var hil = (hue > 30 && 90 > hue) || (hue > 150 && 210 > hue) || (hue > 270 && 330 > hue);
						menuItem.style.backgroundColor = "hsl(" + hue + "," + (30 + ~~(((hil)? 0.1 : 0.2) * ((cs % mw) / mw * 100))) + "%," + (40 + ~~(((!hil)? 0.1 : 0.2) * ((cl % mw) / mw * 100))) + "%)";
						menuItem.style.setProperty("background-position", "-" + idx + "em center", "important");
						
						return true;
					}
				});
				uiMenulist.appendChild(menuItem);
			}
		}
		
		uiTimer = setTimeout(function() {uiPopup.style.display = "block";}, 50);
	}
	
	function uiRemoveItems(targetID, target) {
		for (var a = uiMenulist.querySelectorAll("a[data-rb-target-id=\"" + targetID + "\"]"), i = a.length; i--; a[i].remove());
		target.removeAttribute("rb-hl");
		if (!uiMenulist.childNodes.length) {
			uiTarget = null;
			uiTooltip.style.visibility = "hidden";
			uiPopup.remove();
			(!OPTS.highlightLink || !OPTS.replaceUrl) && uiStyle.remove();
		}
	}
	
	function targetProcess(targetID, target, callback) {
		if (target.hasAttribute("data-rb-store")) {
			var data = JSON.parse(target.getAttribute("data-rb-store"));
			data.targetID = targetID;
			callback(data);
		} else {
			sendMessage({name: "target.process", targetID: targetID, src: target.outerHTML, baseURI: (target.baseURI || doc.baseURI)}, callback);
		}
	}
	
	function targetsAdd(targetID, target) {
		targetProcess(targetID, target, function(data) {
			var i = targetsIDs.indexOf(data.targetID);
			
			if (i !== -1) {
				var show = !!data.index.length;
				
				if (show && (target.nodeName == "A") || (target.nodeName == "AREA")) {
					if (!OPTS.keysShowPopup || (OPTS.keysShowPopup != handleKeyRaw)) {
						if (OPTS.menuHideIfSingleRedir && data.replaceURL && (data.index.length == 1)) {
							show = false;
						}
					}
				}
				
				((show)? (uiAddItems(data, targets[i]), uiShow(handleMouseTarget, CX, CY)) : targetsRemove(targets[i]));
			}
		});
	}
	
	function targetsRemove(target) {
		if (!target) {
			for (var i = targets.length; i--; targetsRemove(targets[i]));
			
		} else {
			var i = targets.indexOf(target);
			
			if (i !== -1) {
				uiRemoveItems(targetsIDs[i], targets[i]);
				clearTimeout(targetsHideTimers[i]);
				clearTimeout(targetsShowTimers[i]);
				targets.splice(i, 1);
				targetsIDs.splice(i, 1);
				targetsRects.splice(i, 1);
				targetsHideTimers.splice(i, 1);
				targetsShowTimers.splice(i, 1);
			}
			
			if (!targets.length) {
				handleMouseTarget = null;
				doc.removeEventListener("mousemove", handleMousemove, false);
				doc.removeEventListener("mouseout", handleMouse, false);
			}
			
			window.HTMLElement.prototype.addEventListener.call(target, "mouseover", handleMouseover, false);
		}
	}
	
	function handleMouse(ev) {
		if (ev.type == "mousemove") {
			var hS = handleMousemoveScroll;
			handleMousemoveScroll = window.pageXOffset + window.pageYOffset;
			
			if ((hS > -1) && (hS != handleMousemoveScroll) && (targets.length > 1)) {
				for (var i = targets.length - 1; i--; targetsRemove(targets[i]));
				
			} else {
				var isUi = uiPopup.contains(ev.target);
				
				for (var i = 0, rect; rect = targetsRects[i]; i++) {
					if (isUi || (ev.clientX > rect.left && ev.clientX < rect.right && ev.clientY > rect.top && ev.clientY < rect.bottom) || targets[i].contains(ev.target)) {
						clearTimeout(targetsHideTimers[i]);
						targetsHideTimers[i] = 0;
						
						if (targetsShowTimers[i] === 0) {
							targetsShowTimers[i] = setTimeout(targetsAdd, OPTS.menuShowDelay, targetsIDs[i], targets[i]);
						}
					} else {
						if (targetsShowTimers[i] !== 0) {
							clearTimeout(targetsShowTimers[i]);
							targetsShowTimers[i] = 0;
						}
						
						if (targetsHideTimers[i] === 0) {
							targetsHideTimers[i] = setTimeout(targetsRemove, OPTS.menuHideDelay, targets[i]);
						}
					}
				}
			}
		} else if ((ev.type == "mouseout") && (ev.relatedTarget === null)) {
			targetsRemove();
		}
	}
	
	function handleMousemove(ev) {
		CX = ev.clientX, CY = ev.clientY; (CX % 2 || CY % 2) && (clearTimeout(handleMousemoveTimer), handleMousemoveTimer = setTimeout(handleMouse, 50, ev));
	}
	
	function handleMouseover(ev) {
		if (OPTS.replaceUrl && ((ev.currentTarget.nodeName == "A") || (ev.currentTarget.nodeName == "AREA")) && !ev.currentTarget.hasAttribute("data-rb-store")) {
			var cTarget = ev.currentTarget;
			
			targetProcess("", ev.currentTarget, function(data) {
				if (data.index.length) {
					cTarget.setAttribute("data-rb-store", JSON.stringify(data));
					
					if (data.replaceURL) {
						cTarget.href = data.replaceURL;
						if (OPTS.highlightLink) {
							doc.head.appendChild(uiStyle);
							cTarget.setAttribute("rb-hl-replace", "");
						}
					}
				}
			});
		}
		
		if ((OPTS.menuEnable && !OPTS.keysShowPopup) || (OPTS.keysShowPopup && (OPTS.keysShowPopup == handleKeyRaw)) && (targets.indexOf(ev.currentTarget) == -1) ) {
			window.HTMLElement.prototype.removeEventListener.call(ev.currentTarget, "mouseover", handleMouseover, false);
			
			var tcW = ev.target.clientWidth, tcH = ev.target.clientHeight, rect;
			
			if (!tcW || !tcH) {
				var el = doc.elementFromPoint(ev.clientX, ev.clientY);
				handleMouseTarget = el;
				rect = el.getBoundingClientRect();
			} else {
				handleMouseTarget = ev.target;
				rect = {height: tcH, width: tcW, top: ev.clientY - ev.layerY, right: ev.clientX - ev.layerX + tcW, bottom: ev.clientY - ev.layerY + tcH, left: ev.clientX - ev.layerX};
			}
			
			targets.push(ev.currentTarget);
			targetsIDs.push(Math.random().toString(36).substr(2, 9));
			targetsRects.push(rect);
			targetsHideTimers.push(0);
			targetsShowTimers.push(0);
			
			if (targets.length === 1) {
				doc.addEventListener("mousemove", handleMousemove, false);
				doc.addEventListener("mouseout", handleMouse, false);
			}
		}
	}
	
	function handleKey() {
		doc.removeEventListener("keyup", handleKeyup, false);
		
		if (handleKeyRaw == OPTS.keysToggleEnableTemp) {
			OPTS.scriptEnabled = !OPTS.scriptEnabled;
			
			if (!OPTS.loaded) {
				sendMessage({name: "opts.get", force: true}, function(data) {
					data.PAGE_DATA.OPTS.scriptEnabled = OPTS.scriptEnabled;
					OPTS.loaded = true;
					redirectBypasser.start(data);
				});
				
			} else {
				redirectBypasser.start({});
			}
			
			sendMessage({name: "notification.show", scriptEnabled: OPTS.scriptEnabled});
			
		} else if (handleKeyRaw == OPTS.keysToggleEnable) {
			sendMessage({name: "state.toggle"});
		}
		
		handleKeyList = {};
		handleKeyRaw = "";
	}
	
	function handleKeyup(ev) {
		clearTimeout(handleKeyTimer); handleKeyTimer = setTimeout(handleKey, 200);
	}
	
	function handleKeydown(ev) {
		if (!ev.repeat) {
			handleKeyList[ev.key || ev.keyIdentifier] = 0;
			handleKeyRaw = Object.keys(handleKeyList).sort().join(",").toUpperCase();
			doc.addEventListener("keyup", handleKeyup, false);
		}
	}
	
	function nodeWatch(el, fromObserver) {
		var add = 2;
		
		if (el.nodeName == "EMBED" || el.nodeName == "OBJECT" || el.nodeName == "VIDEO" || el.nodeName == "AUDIO") {
			add = +!!OPTS.getFromPlugins;
		} else {
			var url = el.href || el.src || el.data || "";
			
			if (url && (
				REGEXPS.CONTAINS_URL_MIDDLE.test(url) ||
				((OPTS.useDeobfuscator) && (
					((el.protocol == "javascript:") && REGEXPS.CONTAINS_URL.test(url)) ||
					(REGEXPS.CONTAINS_REVERSEENCODED_ALLOWEDPROTOCOL.test(url) || REGEXPS.CONTAINS_BASE64ENCODED.test(url) || REGEXPS.CONTAINS_HEXENCODED_ALLOWEDPROTOCOL.test(url))
				))
			)) {
				add = 1;
			} else if (OPTS.getFromTagText && REGEXPS.CONTAINS_URL.test(el.textContent)) {
				add = 1;
			} else if (OPTS.getFromAttributes) {
				for (var i = 0, attrs = el.attributes, attr; attr = attrs[i]; i++) {
					if (!(REGEXPS.IS_EXCLUDED_ATTR.test(attr.name)) && REGEXPS.CONTAINS_URL.test(attr.value)) {
						add = 1;
						break;
					}
				}
			}
		}
		
		if (add === 1) {
			window.HTMLElement.prototype.addEventListener.call(el, "mouseover", handleMouseover, false);
			
			if (fromObserver) {
				var obsr = new MutationObserver(function() {});
				obsr.observe(el, {attributes: true});
			}
			
		} else if (!fromObserver && add === 2 && OPTS.watchAttrModified) {
			observer.observe(el, {attributes: true});
		}
	}
	
	function nodeAdd(el, fromObserver) {
		if (!uiPopup.contains(el)) {
			var n = el.nodeName;
			
			if (n == "A" || n == "AREA" || (OPTS.getFromPlugins && (n == "EMBED" || n == "OBJECT" || n == "VIDEO" || n == "AUDIO"))) {
				nodeWatch(el, fromObserver);
				
			} else if (el.childElementCount && el.querySelectorAll) {
				for (var a = el.querySelectorAll("area,a" + ((OPTS.getFromPlugins)? ",embed,object,video,audio" : "")), i = a.length; i--; nodeWatch(a[i], fromObserver));
			}
		}
	}
	
	this.start = function(data) {
		if (data && ("PAGE_DATA" in data)) {
			if ("REGEXPS" in data.PAGE_DATA) {
				REGEXPS = {
					CONTAINS_URL							: RegExp(data.PAGE_DATA.REGEXPS.CONTAINS_URL, "i"),
					CONTAINS_URL_MIDDLE						: RegExp(data.PAGE_DATA.REGEXPS.CONTAINS_URL_MIDDLE, "i"),
					CONTAINS_REVERSEENCODED_ALLOWEDPROTOCOL	: RegExp(data.PAGE_DATA.REGEXPS.CONTAINS_REVERSEENCODED_ALLOWEDPROTOCOL, "i"),
					CONTAINS_BASE64ENCODED					: RegExp(data.PAGE_DATA.REGEXPS.CONTAINS_BASE64ENCODED),
					CONTAINS_HEXENCODED_ALLOWEDPROTOCOL		: RegExp(data.PAGE_DATA.REGEXPS.CONTAINS_HEXENCODED_ALLOWEDPROTOCOL, "i"),
					IS_EXCLUDED_ATTR						: RegExp(data.PAGE_DATA.REGEXPS.IS_EXCLUDED_ATTR, "i")
				}
			}
			
			if (data.PAGE_DATA["OPTS"]) {
				Object.keys(data.PAGE_DATA["OPTS"]).forEach(function(key) {
					OPTS[key] = data.PAGE_DATA["OPTS"][key];
				});
			}
		}
		
		doc.addEventListener("keydown", handleKeydown, false);
		
		if (OPTS.scriptEnabled) {
			var onDOMContentLoaded = function (ev) {
				ev && ev.currentTarget.removeEventListener("DOMContentLoaded", onDOMContentLoaded, false);
				
				if ((document.contentType == "text/html") && !doc.documentElement.isContentEditable) {
					uiStyle.textContent = "\
						#rb-div, #rb-div * {border: 0!; box-sizing: content-box!; font: Menu!; margin: 0!; padding: 0!; transition: none!;}\
						#rb-div {background-color: transparent!; box-shadow: 0 0 @menuShadowDepth@px #000, 0 0 @menuShadowDepth@px #fff!;opacity: @menuOpacity@!; position: absolute!; z-index: 15000000!;}\
						#rb-div:hover {opacity: @menuOpacityHover@!;}\
						#rb-div a {\
							background-image: url(\"data:image/svg+xml;charset=utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%0D%0A%3Csvg%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Aosb%3D%22http%3A%2F%2Fwww.openswatchbook.org%2Furi%2F2009%2Fosb%22%20height%3D%2232%22%20width%3D%22224%22%20version%3D%221.1%22%20xmlns%3Acc%3D%22http%3A%2F%2Fcreativecommons.org%2Fns%23%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%3E%0D%0A%3Cg%20transform%3D%22translate%280%20-1020.4%29%22%3E%0D%0A%3Cg%20transform%3D%22matrix%28.55078%200%200%20.55078%2032.315%201011%29%22%3E%0D%0A%3Cpath%20d%3D%22m29.385%2022.376v33.589c-0.05297%200.93126-2.0645%200.43156-3.6312%200-4.318-1.659-14.525%200.61102-14.525%207.2624-0.0043%203.2872%204.1141%207.2861%209.078%207.2624%206.5361%200.04302%2011.214-3.9298%2014.525-7.2624v-29.05c5.5756%203.2191%209.0509%206.4666%205.4468%2012.709-0.07976%200.85769%203.0893%201.0908%203.6312%200%205.4564-5.9817%201.1992-13.326-1.8156-16.34-4.1857-4.1857-5.305-4.5809-7.2624-8.1702-0.7021-0.82078-5.2536-0.71436-5.4468%200z%22%20fill%3D%22%23fff%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3Cg%20transform%3D%22matrix%28.55434%200%200%20.55434%2065.128%201002.6%29%22%3E%0D%0A%3Cpath%20style%3D%22color%3A%23000000%22%20d%3D%22m2.4752%2036.55%200.0000102%2048.707h15.334l-0.00001-10.824h18.039l0.00001%2010.824h15.334l-0.00001-48.707h-15.334l-0.000013%205.4118h-18.039v-5.4118zm4.5099%200h7.2158l-0.000013%203.6079h-7.2158zm32.471%200h7.2158v3.6079h-7.2158zm-32.471%209.0197h7.2158v5.4118h-7.2158zm32.471%200h7.2158v5.4118h-7.2158zm-21.647%201.8039h18.039v21.647l-18.039%200.000001zm-10.824%209.0197h7.2158l0.000013%205.4118h-7.2158zm32.471%200.000001h7.2158v5.4118h-7.2158zm-32.471%2010.824h7.2158v5.4118h-7.2158zm32.471%200h7.2158v5.4118h-7.2158zm-32.471%2018.039h7.2158-0.000013zm32.471-7.2158h7.2158v5.4118h-7.2158zm-32.471%200.000001h7.2158v5.4118l-7.2158%200.000037zm32.471%207.2158h0.000005%207.2158l-0.000023%200.000037z%22%20fill%3D%22%23fff%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3Cg%20fill%3D%22%23fff%22%20transform%3D%22translate%28-83%29%22%3E%0D%0A%3Cpath%20style%3D%22color%3A%23000000%22%20d%3D%22m89%201025.9c-2.5462%200-3.5%200.9138-3.5%203.5l-0.000004%2014c0%202.4878%201.0056%203.5%203.5%203.5h20c2.5183%200%203.5-1.0224%203.5-3.5v-14c0-2.5612-1.0774-3.5-3.5-3.5zm-0.5%205c0-2.0035-0.0035-2%202-2h17c2.0035%200%202%200.041%202%202v11c-1.8896-3.2729-6.209-3.1022-8%200-0.22638%200.3921-0.77359%200.3922-1%200-3.7999-6.5816-8.1748-6.6254-12%200z%22%2F%3E%0D%0A%3Ccircle%20cx%3D%22104.5%22%20stroke%3D%22%23fff%22%20cy%3D%221033.9%22%20r%3D%221.44%22%20stroke-width%3D%222.12%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3Cg%20fill%3D%22%23fff%22%3E%0D%0A%3Cpath%20style%3D%22color%3A%23000000%22%20d%3D%22m196.5%201022.9v27h23v-27zm15.5%205h-4l-3.5%201-2%202v1l0.5%201%201-0.5%200.5%202%201.5-0.5v1.5l-1%202%201%201%202%201%200.5%202.5%201.5%201v1.5l1%200.5v-2.5l1-1.5v-1.5l1-1%200.5-1.5%201-2-3-1-1.5%200.5-2-0.5-1.5-1.5-1.5%201%200.5-1-1-1-1%200.5v-1h3.5l2-1%202-1s3.4094%200.4138%203.5%200.5c1.7985%201.7131%203%204.0784%203%207%200%205.4272-3.9079%209.5-9.5%209.5-5.4832%200-9.5-3.9844-9.5-9.5%200-5.4875%203.9819-9.5%209.5-9.5%202.1924%200%204%201%204%201z%22%2F%3E%0D%0A%3Cpath%20d%3D%22m112%201049.9-10.5-10h7v-17h7v17h7z%22%2F%3E%0D%0A%3Cpath%20style%3D%22color%3A%23000000%22%20d%3D%22m131.5%201022.9v4c0-0.7456%201.0115-2%202.5-2%201.3788%200%202.5%200.9648%202.5%202.5%200%201.4413-0.96497%202.5-2.5%202.5-1.5038%200-2.5-1.2462-2.5-2v7c0-0.7851%200.93372-2%202.5-2s2.5%200.9336%202.5%202.5c0%201.535-0.99622%202.5-2.5%202.5-1.535%200-2.5-1.3088-2.5-2v7c0-0.7225%200.99622-2%202.5-2%201.41%200%202.5%200.9649%202.5%202.5%200%201.4414-1.0587%202.5-2.5%202.5-1.4725%200-2.5-1.3091-2.5-2v6c0-0.098%201.0587-1%202.5-1%201.4056%200%202.5%200.7986%202.5%201h20v-27z%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3Cg%20transform%3D%22translate%28.21502%2017%29%22%3E%0D%0A%3Cpath%20style%3D%22color%3A%23000000%22%20d%3D%22m-20.462%2034.746c-0.6261-1.0268-2.9818-1.0268-3.6079%200l-22.549%2036.981c-2.1366%203.504%200.08786%207.2158%204.5099%207.2158h39.687c4.2437%200%206.6124-3.7676%204.5099-7.2158zm-1.8039%207.2158%2019.843%2031.569-39.687-0.000054z%22%20transform%3D%22matrix%28.55434%200%200%20.55434%20188.13%20988.1%29%22%20fill%3D%22%23fff%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3Ccircle%20cx%3D%22176%22%20cy%3D%221042.4%22%20r%3D%221.5%22%20fill%3D%22%23fff%22%2F%3E%0D%0A%3Cpath%20d%3D%22m174.5%201033.9v5h3v-5z%22%20fill-rule%3D%22evenodd%22%20fill%3D%22%23fff%22%2F%3E%0D%0A%3C%2Fg%3E%0D%0A%3C%2Fsvg%3E\")!;\
							background-origin: content-box!; background-repeat: no-repeat!; background-size: 7em 1em!; cursor: pointer!; display: inline-block!; float: left!; font-size: @iconSize@px!; height: 1em!; line-height: 1em!; padding: 1px!; text-decoration: none!; width: 1em!;\
						}\
						#rb-div a:hover {background-color: @tooltipBackgroundColor@!;}\
						#rb-tooltip {background: 2px 2px / 20px auto no-repeat @tooltipBackgroundColor@!; color: @tooltipColor@!; font-size: @tooltipFontSize@px!; line-height: normal!; max-width: 600px!; overflow: hidden!; padding: 2px 2px 2px 24px!; position: absolute!; text-align: left!; text-overflow: ellipsis!; visibility: hidden; white-space: nowrap!; z-index: 15000000!;}\
						#rb-tooltip * {line-height: normal!;}\
						a[rb-hl], a[rb-hl] img, area[rb-hl], a[rb-hl-replace]:hover, a[rb-hl-replace]:hover img, area[rb-hl-replace]:hover {outline: 2px dotted rgba(60,60,60,0.25)!;outline-offset: -1px!;}\
					".replace(/@([^@]+)@/g, function(s, k) {
						return ((OPTS.hasOwnProperty(k))? OPTS[k] : s);
					}).replace(/!;/g, " !important; ");
					
					nodeAdd(doc.body || doc.documentElement);
					OPTS.watchNodeInserted && observer.observe(doc.body || doc.documentElement, {subtree: true, childList: true});
				}
			}
			
			if ((doc.readyState == "loading") || (doc.readyState == "uninitialized")) {
				doc.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
			} else {
				onDOMContentLoaded();
			}
		} else {
			redirectBypasser.stop();
		}
	}
	
	this.stop = function(isFull) {
		observer.disconnect();
		targetsRemove(); //removeEventListener "doc:mousemove:handleMousemove", "doc:mouseout:handleMouse"
		uiStyle.remove();
		clearTimeout(handleMousemoveTimer);
		
		if (isFull) {
			doc.removeEventListener("keydown", handleKeydown, false);
			doc.removeEventListener("keyup", handleKeyup, false);
		}
		
		var els = doc.querySelectorAll("area,a,embed,object,video,audio");
		var i = els.length;
		
		while (i--) {
			var links = JSON.parse(els[i].getAttribute("data-rb-store"));
			
			if (links) {
				els[i].href = links.base.url;
			}
			
			els[i].removeAttribute("data-rb-store");
			els[i].removeAttribute("rb-hl-replace");
			window.HTMLElement.prototype.removeEventListener.call(els[i], "mouseover", handleMouseover, false);
		}
	}
	
	sendMessage({name: "opts.get"}, redirectBypasser.start);
}
}
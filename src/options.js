"use strict";

mlWatcher.onItemsDone("resources", function() {
	var testArea = document.getElementById("test-area");
	testArea.setAttribute("data-attribute-1", "http://example.com/test.avi");
	testArea.setAttribute("data-attribute-2", "http://example.com/test.jpg?url=http://example.com/test.zip");
	testArea.href = "http://example.com/test/"
		+ "?url1=http://example.com/1"
		+ "&url2=http://example.com/t.jpg"
		+ "&url3=http://example.com/t.mp3"
		+ "&aHR0cDovL2V4YW1wbGUuY29tL2Jhc2U2NA=="
		+ "&687474703A2F2F6578616D706C652E636F6D2F686578";
	var _sendMessage	= sendMessage;
	
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
		"click.siterule.add": function(ev, name, val, focused, chkd) {
			siteruleAdd([["*://example.org*"] , ["*.html"]]);
		},
		"click.siterule.add.default": function(ev) {
			SITESRULES_DEFAULT.rules.forEach(siteruleAdd);
			SITESRULES_DEFAULT.ignore.forEach(function(key) {
				addItem("siterule-ignore-pattern").value = key;
			});
		},
		"click.item.clone": function(ev, name, val, focused, chkd) {
			addItem(name);
		},
		"click.form.action": function(ev, type) {
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
		},
		"click.void": function(ev, type) {
			return true;
		},
		"change.language.switch": function(ev) {
			t.load(ev.target.value, function() {
				t.node(document);
			});
		}
	}
	
	OPTS.allowedProtocols.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("protocol-item").value = key.replace(/\\(.)/g, "$1"));
	});
	OPTS.extOrder.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("extorder-item").value = key.replace(/\\(.)/g, "$1"));
	});
	OPTS.excludedAttr.split(/((?:[^\|\\]+|\\.)*)\|/).forEach(function(key) {
		key && (addItem("excludedattr-item").value = key.replace(/\\(.)/g, "$1"));
	});
	SITESRULES.rules.forEach(siteruleAdd);
	SITESRULES.ignore.forEach(function(key) {
		addItem("siterule-ignore-pattern").value = key;
	});
	
	for (
		var a = Object.keys(eventActions), i = a.length;
		i--;
		document.body.addEventListener(a[i].substring(0, a[i].indexOf(".")), handleEvents, true)
	);
	
	t.node(document);
	tabSelect(location.hash || "#general");
	document.addEventListener("change", updateScript, false);
	document.addEventListener("inputafterremove", updateScript, false);
	ce("script", "src", "content-scripts/content.js", document.head);
	
	function handleEvents(ev) {
		var action = ev.target.getAttribute("data-evt-" + ev.type);
		
		if (action) {
			var params = action.split("|"), fnc = eventActions[ev.type + "." + params[0]];
			
			if (fnc) {
				params[0] = ev;
				
				if (fnc.apply(fnc, params)) {
					ev.preventDefault();
				}
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
		var inpParam	= ce(
			"input", 
			"type", "text",
			"value", "*.html",
			"class", "siterule-rule-param",
			"data-removable", "true",
			"data-movable", "siterule-rule-param"
		);
		
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
	
	function getFormData() {
		var sitesrules	=  {ignore: [], rules: []};
		var optsNew		= JSON.parse(JSON.stringify(OPTS));
		
		Object.keys(optsNew).forEach(function(key) {
			q("input[name=\"" + CSS.escape(key) + "\"], select[name=\"" + CSS.escape(key) + "\"]").forEach(function(el) {
				if (el.hasAttribute("data-keyboard-keys")) {
					optsNew[key] = el.getAttribute("data-keyboard-keys");
					
				} else if ((el.type != "radio") || el.checked) {
					optsNew[key] = ((el.type == "checkbox")? el.checked : ((typeof optsNew[key] == "number")? +el.value : el.value));
				}
			});
		});
		
		optsNew.scriptEnabled		= OPTS.scriptEnabled;
		optsNew.allowedProtocols 	= getNodeListValues("input.protocol-item", null, null, function(el) {
			return el.value.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
		}).join("|");
		optsNew.excludedAttr 		= getNodeListValues("input.excludedattr-item", null, null, function(el) {
			return el.value.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
		}).join("|");
		optsNew.extOrder 			= getNodeListValues("input.extorder-item", null, null, function(el) {
			return el.value.trim().replace(/\*|\.|\s/g, "").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
		}).join("|");
		
		q("div.siterule").forEach(function(siterule) {
			var rule = [
				getNodeListValues("input.siterule-rule-pattern", null, siterule),
				getNodeListValues("input.siterule-rule-param", null, siterule)
			];
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
});
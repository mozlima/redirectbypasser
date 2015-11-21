@echo off
cd /d %~dp0
7za a -mx0 redirectbypasser-chrome.zip  ".\src\*" -x!"%C%dev" -x!"%C%bootstrap.js" -x!"%C%chrome.manifest" -x!"%C%install.rdf"
7za a -mx0 redirectbypasser-mozilla.xpi ".\src\*" -x!"%C%dev" -x!"%C%background.js" -x!"%C%manifest.json"
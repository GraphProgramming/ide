onerror = handleErr;

function handleErr(msg, url, l) {
    var txt = "There was an error on this page.\n\n";
    txt += "Error: " + msg + "\n";
    txt += "URL: " + url + "\n";
    txt += "Line: " + l + "\n\n";
    txt += "Reload site?\n";
    if (confirm(txt)){
    }
    return true;
}


function attachEvent(obj, event, callback) {
	/*
	 * Fallunterscheidung automatisch, damit man es nicht immer manuell machen
	 * muss
	 */
	if (obj.addEventListener)
		obj.addEventListener(event, callback, false);
	else if (obj.attachEvent)
		obj.attachEvent('on' + event, callback);
	else
		obj['on' + event] = callback;
}

function connect_server(host, username, password) {
    server_url = host;
    servers[host] = [username, password];
    localStorage.servers = JSON.stringify(servers);
    var hostname = host;
    var port = 12345;
    if (host.includes(":")) {
      var tmp = hostname.split(":");
      hostname = tmp[0];
      port = parseInt(tmp[1]);
    }
    remote_entanglement(hostname, port, username, password, on_entangle, WebUI.printError, host);
}

function on_entangle(conn, host) {
    entanglement = conn;
  
    /*function updateServerStatus(status) {
      serverStates[host] = status;
      updateServerList();
    }
    entanglement.set("update_server_status", updateServerStatus);*/
}

function getSrc(nodeCode, callback, callbackFailure) {
    var params = "getsrc=" + encodeURIComponent(nodeCode);
    sendViaPostRaw(params, callback, callbackFailure)
}

function setSrc(nodeCode, src, callbackFailure) {
    var params = "setsrc=" + encodeURIComponent(nodeCode) + "&value=" + encodeURIComponent(src);
    sendViaPostRaw(params, function(e) {}, callbackFailure)
}

function getGraph(graph, callback, callbackFailure) {
    var params = "getgraph=" + graph;
    sendViaPost(params, callback, callbackFailure)
}

function listGraphs(callback, callbackFailure) {
    var params = "listGraphs=" + true;
    sendViaPost(params, callback, callbackFailure)
}

function getNodes(graph, callback, callbackFailure) {
    var params = "getnodes=" + graph;
    sendViaPost(params, callback, callbackFailure)
}

function setGraph(graph, data, callback, callbackFailure) {
    var params = "setgraph=" + encodeURIComponent(graph) + "&value=" + encodeURIComponent(JSON.stringify(data, null, "\t"));
    sendViaPost(params, callback, callbackFailure)
}

function sendViaPost(params, callback, callbackFailure) {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            if (xmlhttp.responseText != "") {
                if (callback != null) {
                    try{
                        var inobject = JSON.parse(xmlhttp.responseText);
                        callback(inobject);
                    } catch (err) {
                        console.log(xmlhttp.responseText);
                    }
                }
            }
        } else if (xmlhttp.readyState==4) {
            if (callbackFailure != null) {
                callbackFailure(xmlhttp.responseText);
            }
        }
    }
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function sendViaPostRaw(params, callback, callbackFailure) {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            if (xmlhttp.responseText != "") {
                if (callback != null) {
                    var inobject = xmlhttp.responseText;
                    callback(inobject);
                }
            }
        } else if (xmlhttp.readyState==4) {
            if (callbackFailure != null) {
                callbackFailure(xmlhttp.responseText);
            }
        }
    }
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function execute(graph, callback, callbackFailure) {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            if (xmlhttp.responseText != "") {
                if (callback != null) {
                    callback(xmlhttp.responseText);
                }
            }
        } else if (xmlhttp.readyState==4) {
            if (callbackFailure != null) {
                callbackFailure(xmlhttp.responseText);
            }
        }
    }
    var params = "execGraph=" + graph;
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function start(graph, language, passwd, callback, callbackFailure, callbackError) {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            update(graph, callback, callbackFailure, callbackError);
            if (callback != null) {
                callback(xmlhttp.responseText);
            }
        } else if (xmlhttp.readyState==4) {
            if (callbackFailure != null) {
                callbackFailure(xmlhttp.responseText);
            }
        }
        if (xmlhttp.status === 404) {
            callbackError();
            return;
        }
    }
    var params = "startGraph=" + graph + "&execEnv=" + language + "&passwd=" + passwd;
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function update(graph, callback, callbackFailure, callbackError) {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            setTimeout(function() { update(graph, callback, callbackFailure, callbackError); }, 200);
            if (callback != null) {
                callback(xmlhttp.responseText);
            }
        } else if (xmlhttp.readyState==4) {
        }
        if (xmlhttp.status === 404) {
            callbackError();
            return;
        }
    }
    var params = "updateGraph=" + graph;
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function kill() {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            if (xmlhttp.responseText != "") {
                if (callback != null) {
                    console.log(xmlhttp.responseText);
                }
            }
        } else if (xmlhttp.readyState==4) {
            console.log(xmlhttp.responseText);
        }
    }
    var params = "killGraph=" + true;
    xmlhttp.open("POST", server_url + "/api",true);
    //Send the proper header information along with the request
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send(params);
}

function sendViaGet(params, callback, callbackFailure) {
	var xmlhttp;
    if (window.XMLHttpRequest) {
    	xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
    	if (xmlhttp.readyState==4 && xmlhttp.status==200) {
            if (xmlhttp.responseText != "") {
                if (callback != null) {
                    var inobject = JSON.parse(xmlhttp.responseText);
                    callback(inobject);
                }
            }
        } else if (xmlhttp.readyState==4) {
            if (callbackFailure != null) {
                callbackFailure(xmlhttp.responseText);
            }
        }
    }
    xmlhttp.open("POST", server_url + "/api?"+params,true);
    xmlhttp.send();
}

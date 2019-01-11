/*onerror = handleErr;

function handleErr(msg, url, l) {
    var txt = "There was an error on this page.\n\n";
    txt += "Error: " + msg + "\n";
    txt += "URL: " + url + "\n";
    txt += "Line: " + l + "\n\n";
    txt += "Reload site?\n";
    if (confirm(txt)){
    }
    return true;
}*/


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
    server_url = host;
    window.setTimeout(WebUI.connected, 1000);
}

function getSrc(nodeCode, callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_get_src", callback);
        entanglement.remote_fun("get_src")(nodeCode);
    }
}

function setSrc(nodeCode, src, callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_set_src", callback);
        entanglement.remote_fun("set_src")(nodeCode, src);
    }
}

function getGraph(graph, callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_get_graph", callback);
        entanglement.remote_fun("get_graph")(graph);
    }
}

function listGraphs(callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_list_graphs", callback);
        entanglement.remote_fun("list_graphs")();
    }
}

function getNodes(language, callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_get_nodes", callback);
        entanglement.remote_fun("get_nodes")(language);
    }
}

function setGraph(graph, data, callback) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_set_graph", callback);
        entanglement.remote_fun("set_graph")(graph, JSON.stringify(data, null, "\t"));
    }
}

function start(graph, language, error) {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.set("on_start", error);
        entanglement.set("on_kill", WebUI.killDebug);
        entanglement.remote_fun("start")(graph, language);
    }
}

function kill() {
    if (entanglement == null) {
        WebUI.showLoginDialog();
    } else {
        entanglement.remote_fun("kill")();
    }
}

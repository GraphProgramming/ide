var WebUI = new WebUI_CWebUI();

function WebUI_CWebUI() {
	var that = this;
	var KeyListener = null;
	var RenderEngine = null;
    var moved = false;
    var moveOffsetX = 0;
    var moveOffsetY = 0;
    var codeMirror = null;
    var codeTheme = "default";
    var promptCallback = null;
    var conMode = true;
    var gridSize = 10;
    this.debugger = null;
    this.currentNode = null;
	this.keyboard_input_state = true;
	this.mouse_click_listener = null;
	this.debug = false;
	this.graph = null;
    this.graphStack = new Array();
    this.graphNameStack = new Array();
    this.currentLanguage = "pyGP";
	this.nodes = null;
	this.selectedNode = null;
	this.graphName = "Default";
	this.selectedConnection = null;
	this.startPos = null;
	this.clickNode = null;
    this.graphRunning = false;

    this.isConMode = function() {
        return conMode;
    };
	
	this.start = function(fullscreen, container, initialGraph) {
		/* check if dependencies are already existing */
		if (KeyListener == null && RenderEngine == null) {
			KeyListener = new WebUI_CKeyListener();
			RenderEngine = new WebUI_CRenderEngine();
		} else {
			return false; /* an error occured, there is already running a web ui on this tab. */
		}
        that.graphName = initialGraph;

		/* init the RenderEngine */
		var canvas = RenderEngine.init(fullscreen, container);
		RenderEngine.render(60);
		/* init the ObjectManager, needs canvas for MouseHandlers */
		KeyListener.init(canvas);
		/* start the render loop with the key listener */
		KeyListener.launch(RenderEngine);

        RenderEngine.setHasParent(false);
          
        function load() {
            $(window).bind('keydown', function(event) {
              event = event || window.event;
                if (event.ctrlKey || event.metaKey) {
                    switch (String.fromCharCode(event.which).toLowerCase()) {
                    case 's':
                        event.preventDefault();
                        console.log("TODO Save");
                        break;
                case 'r':
                  event.preventDefault();
                  console.log("TODO run");
                  break;
                    }
                
                }
              if (event.keyCode == 116) {
                event.preventDefault();
                console.log("TODO run");
              }
            });
      
            var editorContainer = document.getElementById("editor");
            editor = monaco.editor.create(editorContainer, {
              value: "# This is no real document.\n# \n# It does not exist on your server and only has the purpose \n# to display something when no file is opened!\n",
              language: "python",
              theme: "vs-dark"
            });
            editor.setModel(null);
            that.layout();
        }

        require(['vs/editor/editor.main'], function() {
            load();
        });

		return true;
    };

    this.layout = function() {
        var editorContainer = document.getElementById("editor");
        var editorParent = document.getElementById("innercodeeditor");

        var GLOBAL_PADDING = 0;
    
        var WIDTH = editorParent.offsetWidth - 2 * GLOBAL_PADDING;
        var HEIGHT = editorParent.offsetHeight;
    
        editorContainer.style.display = "inline-block";
        editorContainer.style.width = (WIDTH * 0.9 - 20) + 'px';
        editorContainer.style.height = (HEIGHT * 0.9 - 150) + 'px';

        editor.layout();
    };
    
    this.connected = function() {
        if (entanglement != null) {
            getGraph(that.graphName, that.setGraph);
            getNodes(that.currentLanguage, that.setNodes);
            showInfo();

            WebUI.debugger = new CDebugger(entanglement, that, RenderEngine);
            entanglement.set("on_debug_msg", WebUI.debugger.onDebugMsg);
        }
    };
    
    this.setTheme = function(theme) {
        that.theme = theme;
        if (theme == "dark") {
            RenderEngine.setTheme("#333333", "green", "#D75813", "darkslategray", "darkviolet", "#AB0000", "rgba(150,150,150,0.6)", "darkgray", "#AB0000");
            codeTheme = "lesser-dark";
        } else if (theme == "light") {    
            RenderEngine.setTheme("white", "#3CB371", "orange", "darkslategray", "violet", "indianred", "rgba(128,128,128,0.6)", "rgb(128,128,128)", "red");
            codeTheme = "default";
        }
    }

	this.setGraph = function(graph) {
        if (graph == null) {
            that.printError("Graph could not be loaded.");
            return;
        }
        graph = JSON.parse(graph);
        that.graphStack.push(graph);
        that.graphNameStack.push(that.graphName);
		that.graph = graph;
        localStorage.graph = that.graphName;
        if (that.graphStack.length > 1) {
            RenderEngine.setHasParent(true);
        }
        RenderEngine.setDirty();
		that.changed = false;
	};

	this.setNodes = function(nodes) {
        if (nodes == null) {
            that.printError("Could not read list of nodes.");
            return;
        }
		that.nodes = JSON.parse(nodes);
        var compare = function (a,b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        };
        that.nodes.sort(compare);
	};

	this.saveGraph = function(name) {
		setGraph(name, that.graph, that.savedGraph);
	};

	this.savedGraph = function(success) {
        if (success == null) {
            that.printError("Could not save the graph.");
        }
	};

	this.printError = function(text) {
        if (entanglement == null || text in servers) {
            that.showLoginDialog();
        } else {
            document.getElementById("erroroverlay").style.display = "";
            document.getElementById("innererroroverlay").innerHTML = '<h2>An Error Occured</h2>' + text;
            console.log(text);
        }
	};
    
	this.printErrorTitled = function(title, text) {
        document.getElementById("erroroverlay").style.display = "";
        document.getElementById("innererroroverlay").innerHTML = '<h2>' + title + '</h2>' + text;
	};
    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 5; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
    
    this.openGraph = function(graphs) {
        if (graphs == null) {
            that.printError("Could not get a list of the graphs.");
            return;
        }
        var classes = {};
		graphs.forEach(function(graph) {
		    graph = graph.substring(2, graph.length - 11);
            var nodetype = "outputnode";
            if (graph.lastIndexOf("private", 0) === 0) {
                nodetype = "inputnode";
            } else if (graph.lastIndexOf("test", 0) === 0) {
                nodetype = "debugnode";
            } else if (graph.lastIndexOf("ignored", 0) === 0 || graph.lastIndexOf("samples", 0) === 0) {
                nodetype = "algorithmnode";
            }
            var split = graph.split("/");
            var cur = "default";
            var graphName = split[0];
            if (split.length > 1) {
                cur = split[0];
                graphName = split[1];
            }
            if (!classes[cur]) {
                prefix = cur;
                classes[cur] = "<h2>" + prefix.toUpperCase() + "</h2>";
            }
			classes[cur] += '<button onclick="WebUI.loadGraph(\'' + graph + '\')" class="node ' + nodetype + '">' + graphName + '</button>';
		});
        var classesStr = "";
        var keys = [];
        for (var key in classes) {
            if (classes.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        keys = keys.sort();
        for (var key in keys) {
            classesStr += classes[keys[key]];
        }
        document.getElementById("innergraphselector").innerHTML = classesStr;
        document.getElementById("graphselector").style.display = "";
    }
    
    this.loadGraph = function(name) {
		if (name == null) {
			return;
		}
		WebUI.graphName = name;
        that.graphStack = new Array();
        that.graphNameStack = new Array();
        RenderEngine.setHasParent(false);
		getGraph(WebUI.graphName, WebUI.setGraph);
		that.hideGraphSelector();
    }

    this.createNode = function(nodeclass) {
				if (nodeclass == null) {
					return;
				}
                
                that.hideNodeSelector();
				var selectedNode = null;
				that.nodes.forEach(function(node) {
					if (node.code == nodeclass) {
						selectedNode = node;
					}
				});
				if (selectedNode == null) {
					return;
				}
				WebUI.prompt("Node Name", selectedNode.name,
                    function(nodename) {
                        if (nodename == null) {
					        return;
				        }
				        selectedNode = JSON.parse(JSON.stringify(selectedNode));
				        selectedNode.name = makeid();
                        selectedNode.displayname = nodename;
				        graph.nodes.push(selectedNode);
                        RenderEngine.setDirty();

				        that.changed = true;
                    }
                );
    };
    
    this.prompt = function(text, value, callback) {
        promptCallback = callback;
        var html = "<h1>"+text+"</h1>"+
            "<div><input id='promptinput' class='hinput' value='" + value + "' /></div>"+
            "<div style='padding-top:1em'>"+
            "<button onclick='WebUI.cancelPrompt()' class='button outputnode right'>CANCEL</button>"+
            "<button onclick='WebUI.successPrompt()' class='button inputnode right'>OK</button>"+
            "</div>";
        document.getElementById("innerprompt").innerHTML = html;
        //callback(prompt(text, value));
        document.getElementById("prompt").style.display = "";
    };
    
    this.cancelPrompt = function() {
        if (promptCallback != null) {
            promptCallback(null);
        }
        promptCallback = null;
        document.getElementById("prompt").style.display = "none";
    };
    
    this.successPrompt = function() {
        if (promptCallback != null) {
            promptCallback(document.getElementById("promptinput").value);
        }
        promptCallback = null;
        document.getElementById("prompt").style.display = "none";
    };
    
    this.hideNodeSelector = function() {
        document.getElementById("nodeselector").style.display = "none";
    };
    
    this.hideGraphSelector = function() {
        document.getElementById("graphselector").style.display = "none";
    };
    
    this.changeLanguage = function(language) {
        that.currentLanguage = language;
        localStorage.currentLanguage = language;
        if (document.getElementById("current_language")) {
            document.getElementById("current_language").innerHTML = language;
        }
        getNodes(language, that.setNodes);
    };
    this.hideLanguageSelector = function() {
        document.getElementById("languageselector").style.display = "none";
    };
    
    this.hideErrorOverlay = function() {
        document.getElementById("erroroverlay").style.display = "none";
    };

    this.showLoginDialog = function() {
        if (entanglement != null) {
            entanglement.close();
            entanglement = null;
        }
        document.getElementById("loginoverlay").style.display = "";
        var content = "";
        for (var server in servers) {
            content += "<option value='" + server + "'>" + server + "</option>";
        }
        document.getElementById("select_server_url").innerHTML = content;
    };

    this.hideLoginOverlay = function() {
        document.getElementById("loginoverlay").style.display = "none";
    };

    this.connectServer = function() {
        var url = document.getElementById("add_server_url").value;
        var username = document.getElementById("add_server_username").value;
        var password = document.getElementById("add_server_password").value;

        connect_server(url, username, password);
        that.hideLoginOverlay();
    };

    this.selectServer = function() {
        var url = document.getElementById("select_server_url").value;
        connect_server(url, servers[url][0], servers[url][1]);
        that.hideLoginOverlay();
    };
    
    this.hideCodeEditor = function() {
        document.getElementById("codeeditor").style.display = "none";
    };

    this.loadBtn = function() {
        listGraphs(that.openGraph);
    };

    this.saveBtn = function() {
        if (that.changed == true) {
            WebUI.prompt("Save: Please enter graph name", WebUI.graphName, function(name) {if (name == null) {console.log("Abortion");return;}WebUI.graphName = name;WebUI.saveGraph(WebUI.graphName);that.changed = false;});
        }
    };

    this.languageBtn = function() {
        document.getElementById("languageselector").style.display = "";
    };

    this.trySelect = function(x, y) {		
        var scale = RenderEngine.getScale();
		var absX = x + RenderEngine.getOffsetX() * scale + RenderEngine.getSize().width / 2;
		var absY = y + RenderEngine.getOffsetY() * scale + RenderEngine.getSize().height / 2;
        var canvasSize = RenderEngine.getSize();
        if (absX < canvasSize.width - 10 && absX > canvasSize.width - 50) {
            if (absY > 10 && absY < 40) {
				RenderEngine.changeScale(-0.2);
				return;
			}
			if (absY > 50 && absY < 80) {
				RenderEngine.changeScale(0.2);
				return;
			}
            /*if (absY > RenderEngine.getSize().height / 2 - 15 && absY < RenderEngine.getSize().height / 2 + 15) {
                if (RenderEngine.showInfo) {
                    showInfo();
                } else {
                    hideInfo();
                }
                return;
            }*/
        }
		if (absX > 10 && absX < 50) {
			//if (absY > 10 && absY < 40) {
			//	return;
			//}
			//if (absY > 50 && absY < 80) {
			//	return;
			//}
			if (absY > 90 && absY < 120) {
				conMode = !conMode;
				RenderEngine.setDirty();
				return;
			}

			if (absY > 10 && absY < 40) {
				var classes = {};

				that.nodes.forEach(function(node) {
                    var nodetype = "algorithmnode";
                    var tmp = node.code.split(".");
                    var nodepackage = tmp[tmp.length - 2];
                    if (tmp.length < 2) {
                        nodepackage = ". (local)";
                    }
                    if (Object.keys(node.inputs).length == 0) {
                        nodetype = "inputnode";
                    } else if (Object.keys(node.outputs).length == 0) {
                        nodetype = "outputnode";
                    } else if (nodepackage.lastIndexOf("structures", 0) === 0 || (nodepackage.lastIndexOf("default", 0) === 0 && nodepackage.lastIndexOf("function", "default.".length) < 0)) {
                        nodetype = "structurenode";
                    } else if (nodepackage.lastIndexOf("debug") === 0) {
                        nodetype = "debugnode";
                    }
                    var cur = node.code.substring(0, node.code.lastIndexOf('.'));
                    cur = nodepackage;
                    if (!classes[cur]) {
                        prefix = cur;
                        classes[cur] = "<h2>" + prefix.toUpperCase() + "</h2>";
                        if (prefix == "default" && localStorage.devmode == "true") {
					        classes[cur] += '<button onclick="WebUI.createNewNode()" class="node newnode">(DEV) Define New</button>';
                        }
                    }
					classes[cur] += '<button onclick="WebUI.createNode(\'' + node.code + '\')" class="node ' + nodetype + '">' + node.name + '</button>';
				});
                var classesStr = "";
                var keys = [];
                for (var key in classes) {
                    if (classes.hasOwnProperty(key)) {
                        keys.push(key);
                    }
                }
                keys = keys.sort();
                classesStr += classes["default"];
                classesStr += classes["structures"];
                for (var key in keys) {
                    if (keys[key] == "structures" || keys[key] == "default") {
                        continue;
                    }
                    classesStr += classes[keys[key]];
                }
                document.getElementById("innernodeselector").innerHTML = classesStr;
                document.getElementById("nodeselector").style.display = "";
				return;
			}
			if (absY > 50 && absY < 80) {
                that.printErrorTitled("Hint","Drop a node here to delete it.");
				return;
			}
			/*if (absY > 210 && absY < 240) {
				if (that.changed == true) {
					var name = prompt("Autosave: Please enter graph name", WebUI.graphName);
					if (name == null) {
						return;
					}
					WebUI.graphName = name;
					WebUI.saveGraph(WebUI.graphName);
					that.changed = false;
				}
				execute(that.graphName, RenderEngine.setResult, RenderEngine.setResult);
				return;
			}*/
			if (absY > 370 && absY < 390) {
                if (that.graphStack.length < 2) {
                    return;
                }
				if (that.changed == true) {
					that.graphName = name;
					that.saveGraph(that.graphName);
				}
                that.graphStack.pop();
                that.graphNameStack.pop();
                that.graph = that.graphStack[that.graphStack.length-1];
                that.graphName = that.graphNameStack[that.graphNameStack.length-1];
                if (that.graphStack.length < 2) {
                    RenderEngine.setHasParent(false);
                }
                RenderEngine.setDirty();
				return;
			}
		}

		that.startPos = {"x":x+RenderEngine.getOffsetX(), "y":y+RenderEngine.getOffsetY()};

		graph.nodes.forEach(function(node) {
			var x1 = node.x * scale - RenderEngine.nodeWidth/2 * scale;
			var y1 = node.y * scale - RenderEngine.nodeHeight/2 * scale;
			var x2 = node.x * scale + RenderEngine.nodeWidth/2 * scale;
			var y2 = node.y * scale + RenderEngine.nodeHeight/2 * scale;
			if (x > x1 && x < x2 && y > y1 && y < y2) {
				that.selectedNode = node;
                moveOffsetX = node.x * scale - x;
                moveOffsetY = node.y * scale - y;
                moved = false;
				return;
			}
			if (!that.isConMode()) {
				var input = tryFindInput(node, x, y);
				if (input != null) {
					that.selectedNode = node;
					that.selectedInputConnection = input;
					updateGraph(that.selectedNode, null, that.selectedInputConnection, null);
					return;
				}
				var output = tryFindOutput(node, x, y);
				if (output != null) {
					that.selectedNode = node;
					that.selectedOutputConnection = output;
					//updateGraph(null, that.selectedNode, null, that.selectedOutputConnection);
					return;
				}
			}
		});
	};
    
    this.deselectNode = function () {
        document.getElementById("infocontent").innerHTML = "Click/Tap on a node to show info about it.";
        RenderEngine.marked = null;
        that.currentNode = null;
        RenderEngine.setDirty();
    }
    
    this.nodeChanged = function () {
        if (document.getElementById("args")) {
            that.currentNode.args = JSON.parse(document.getElementById("args").value);
        }
        if ((typeof that.currentNode.args) == "object") {
            for (var property in that.currentNode.args) {
                if (that.currentNode.args.hasOwnProperty(property)) {
                    
                    if (property == "code") {
                        // Do nothing, is only changed via editor.
                    } else {
                        elemId = "args-" + property;
                        that.currentNode.args[property] = JSON.parse(document.getElementById(elemId).value);
                    }
                }
            }
        }
        
        that.currentNode.desc = document.getElementById("desc").value;
        that.currentNode.displayname = document.getElementById("displayname").value;
	    that.changed = true;
        RenderEngine.setDirty();
        if (that.graphRunning == true) {
            that.restartDebug();
        }
    }
    
    this.saveCodeEdit = function (property) {
        that.currentNode.args[property] = editor.getValue();
        that.changed = true;
        RenderEngine.setDirty();
        WebUI.hideCodeEditor();
    }
    
    this.createNewNode = function() {
        var sampleSrc = `def init(node, global_state):
    def tick(value):
        return {}

    node["tick"] = tick

def spec(node):
    node["name"] = "MyNode"
    node["desc"] = "Does stuff"
`;
        if (that.currentLanguage == "luaGP") {
          sampleSrc = `local myNode = {}
function myNode.init(node)
  node.tick = function(value)
    print("Not implemented yet.")
    return {}
  end
end

function myNode.spec(node)
  node.name = "Unnamed Node"
  node.inputs.val = "Object"
  node.desc = "Print a not implemented msg"
end

return myNode
`;
        }
        that.showCode(sampleSrc, "package.name");
    }
    
    this.saveNewNode = function() {
        nodeCode = document.getElementById("nodeCode").value;
        src = editor.getValue();
        var fileending = ".py";
	    var packageName = "pyGP";
        if (that.currentLanguage == "luaGP") {
            fileending = ".lua";
	        packageName = "luaGP";
        }
        setSrc(packageName + "/" + nodeCode + fileending, src, that.onSaved);
    }
    
    this.saveCodePeek = function() {
        that.saveNewNode();
    }

    this.onSaved = function(graph) {
        if (graph != null) {
            WebUI.hideCodeEditor();
        } else {
            that.printError("Cannot save the file.");
        }
    }
    
    this.codeEdit = function(property) {
        var src = that.currentNode.args[property];
        that.showCode(src);
    }
    
    this.showCode = function(src, name=null) {
        if (src == null) {
            WebUI.hideCodeEditor();
            that.printError("Sourcecode not found!");
            return;
        }
        var fileending = ".py";
        var packageName = "pyGP";
        var programmingLanguage = "python";
        if (that.currentLanguage == "luaGP") {
            fileending = ".lua";
	        packageName = "luaGP";
            programmingLanguage = "lua";
        }
        var code = null;
        if (name != null) {
            code = name;
        } else {
            code = that.currentNode.code;
        }
        window.setTimeout(that.layout, 200);
        var model = monaco.editor.createModel(src, programmingLanguage);
        editor.setModel(model);
        document.getElementById("nodeCode").value = code;    
        document.getElementById("codeeditor").style.display = "";
    };
    
    
    this.codePeek = function(property) {
        var fileending = ".py";
	    var packageName = "pyGP";
        if (that.currentLanguage == "luaGP") {
            fileending = ".lua";
	    packageName = "luaGP";
        }
        var code = packageName + "." + property + fileending;
        that.showCode("Downloading code: " + code);
        getSrc(code, that.showCode);
    }

	function tryFindInput(node, x, y) {
        var scale = RenderEngine.getScale();
		var result = null;
		for (var connection in node.inputs) {
  			if (node.inputs.hasOwnProperty(connection)) {
				var pos = RenderEngine.getNodeInputPosition(that.graph, node.name, connection);
				var x1 = pos.x * scale - RenderEngine.dotTouchSize/2 * scale;
				var y1 = pos.y * scale - RenderEngine.dotTouchSize/2 * scale;
				var x2 = pos.x * scale + RenderEngine.dotTouchSize/2 * scale;
				var y2 = pos.y * scale + RenderEngine.dotTouchSize/2 * scale;
				if (x > x1 && x < x2 && y > y1 && y < y2) {
					var result = connection;
					return connection;
				}
			}
		}
		return result;
	}

	function tryFindOutput(node, x, y) {
        var scale = RenderEngine.getScale();
		var result = null;
		for (var connection in node.outputs) {
  			if (node.outputs.hasOwnProperty(connection)) {
				var pos = RenderEngine.getNodeOutputPosition(that.graph, node.name, connection);
				var x1 = pos.x * scale - RenderEngine.dotTouchSize/2 * scale;
				var y1 = pos.y * scale - RenderEngine.dotTouchSize/2 * scale;
				var x2 = pos.x * scale + RenderEngine.dotTouchSize/2 * scale;
				var y2 = pos.y * scale + RenderEngine.dotTouchSize/2 * scale;
				if (x > x1 && x < x2 && y > y1 && y < y2) {
					var result = connection;
					return connection;
				}
			}
		}
		return result;
	}

	this.findNode = function(name) {
	    var result = null;
	    graph.nodes.forEach(function(node) {
	        if (node.name == name) {
	            result = node;
	        }
	    });
	    return result;
    }
	this.moveSelected = function(x, y) {
        var scale = RenderEngine.getScale();
		var absX = x + RenderEngine.getOffsetX() + RenderEngine.getSize().width / 2;
		var absY = y + RenderEngine.getOffsetY() + RenderEngine.getSize().height / 2;
		if (that.selectedInputConnection != null) {
			var pos = RenderEngine.getNodeInputPosition(that.graph, that.selectedNode.name, that.selectedInputConnection);
			RenderEngine.tmpNodeLine(pos.x, pos.y, x / scale, y / scale);
		} else if (that.selectedOutputConnection != null) {
			var pos = RenderEngine.getNodeOutputPosition(that.graph, that.selectedNode.name, that.selectedOutputConnection);
			RenderEngine.tmpNodeLine(pos.x, pos.y, x / scale, y / scale);
		} else if (that.selectedNode != null) {
			var tx = x / scale + moveOffsetX / scale;
			var ty = y / scale + moveOffsetY / scale;
			if (moved == false && Math.abs(tx - that.selectedNode.x) < 20 && Math.abs(ty - that.selectedNode.y) < 20) {
			    return;
			}
			that.selectedNode.x = (tx / gridSize).toFixed() * gridSize;
			that.selectedNode.y = (ty / gridSize).toFixed() * gridSize;
            moved = true;
            RenderEngine.setDirty();
		} else if (that.startPos != null) {
			var nextPos = {"x":x+RenderEngine.getOffsetX(), "y":y+RenderEngine.getOffsetY()};
			RenderEngine.move(nextPos.x - that.startPos.x, nextPos.y - that.startPos.y);
			that.startPos = nextPos;
		}
	};

	this.unselect = function(x, y) {
        var scale = RenderEngine.getScale();
		var absX = x + RenderEngine.getOffsetX() * scale + RenderEngine.getSize().width / 2;
		var absY = y + RenderEngine.getOffsetY() * scale + RenderEngine.getSize().height / 2;
		var spos = that.startPos;
		that.startPos = null;
		if (that.selectedInputConnection != null) {
			var outputName = null;
			var outputNode = null;
			graph.nodes.forEach(function(node) {
				var output = tryFindOutput(node, x, y);
				if (output != null) {
					outputName = output;
					outputNode = node;
					return;
				}
			});
            if (outputNode != null) {
                updateGraph(that.selectedNode, outputNode, that.selectedInputConnection, outputName);
            }
			RenderEngine.removeTmpNodeLine();
			that.selectedInputConnection = null;
			that.selectedNode = null;
			that.changed = true;
            RenderEngine.setDirty();
		} else if (that.selectedOutputConnection != null) {
			var inputName = null;
			var inputNode = null;
			graph.nodes.forEach(function(node) {
				var input = tryFindInput(node, x, y);
				if (input != null) {
					inputName = input;
					inputNode = node;
					return;
				}
            });
            if (inputNode != null) {
                updateGraph(inputNode, that.selectedNode, inputName, that.selectedOutputConnection);
            }
			RenderEngine.removeTmpNodeLine();
			that.selectedOutputConnection = null;
			that.selectedNode = null;
			that.changed = true;
            RenderEngine.setDirty();
		} else if (that.selectedNode != null) {
            if (!moved) {
                that.currentNode = that.selectedNode;
				that.clickNode = null;
				that.startPos = null;
                var html = "";
                var nname = that.currentNode.displayname;
                html += "<h3><input class='hinput' id='displayname' value='" + nname + "' /></h3>";
                //console.log(currentNode);
                html += "<h4>Code</h4><p>" + that.currentNode.code + "<button class='button algorithmnode right' onclick='WebUI.codePeek(\"" + that.currentNode.code + "\")'>Peek</button></p>";
                html += "<h4>Desc</h4><p><input class='pinput' id='desc' value='" + that.currentNode.desc + "' /></p>";
                
                html += "<h4>Inputs</h4><p>"
                for (var property in that.currentNode.inputs) {
                    if (that.currentNode.inputs.hasOwnProperty(property)) {
                        html += "" + property + ": " + JSON.stringify(that.currentNode.inputs[property]) + "<BR>";
                    }
                }
                html += "</p>";
                html += "<h4>Outputs</h4><p>"
                for (var property in that.currentNode.outputs) {
                    if (that.currentNode.outputs.hasOwnProperty(property)) {
                        html += "" + property + ": " + JSON.stringify(that.currentNode.outputs[property]) + "<BR>";
                    }
                }
                html += "</p>";
                
                var iteratable = false;
                if ((typeof that.currentNode.args) == "object") {
                for (var property in that.currentNode.args) {
                    if (that.currentNode.args.hasOwnProperty(property)) {
                        if (iteratable == false) {
                            html += "<h4>Args</h4><p>"
                        }
                        if (property == "code") {
                            html += "" + property + ": <button class='button algorithmnode right' onclick='WebUI.codeEdit(\""+property+"\")'>Edit</button><BR>";
                        } else {
                            html += "" + property + ": <input class='pinput' id='args-" + property + "' value='" + JSON.stringify(that.currentNode.args[property]) + "' /><BR>";
                        }
                        iteratable = true;
                    }
                }
                }
                if (iteratable == false) {
                    html += "<h4>Args</h4><p><input class='pinput' id='args' value='" + JSON.stringify(that.currentNode.args) + "' /></p>";
                } else {
                    html += "</p>"
                }
                if(that.currentNode.code == "system.subgraph") {
				    html += "<p><button class='node algorithmnode right' onclick='getGraph(\"" + that.currentNode.args + "\", WebUI.setGraph)'>Edit Subgraph</button><p>";
                }
                html += "<p style='padding-top:1em'><button class='button inputnode' onclick='WebUI.nodeChanged()'>Save</button>";
                html += "<button class='button outputnode' onclick='WebUI.deselectNode()'>Unselect</button></p>";
                document.getElementById("infocontent").innerHTML = html;
                RenderEngine.marked = that.currentNode;
                showInfo();
                RenderEngine.setDirty();
			} else {
			    tx = x / scale + moveOffsetX / scale;
                ty = y / scale + moveOffsetY / scale;
                
			    that.selectedNode.x = (tx / gridSize).toFixed() * gridSize;
			    that.selectedNode.y = (ty / gridSize).toFixed() * gridSize;
                RenderEngine.setDirty();

			    if (absX > 10 && absX < 50 && absY > 50 && absY < 80) {
			    	for (var connection in that.selectedNode.inputs) {
  			    		if (that.selectedNode.inputs.hasOwnProperty(connection)) {
			    			updateGraph(that.selectedNode, null, connection, null, true);
			    		}
			    	}
			    	for (var connection in that.selectedNode.outputs) {
  			    		if (that.selectedNode.outputs.hasOwnProperty(connection)) {
			    			updateGraph(null, that.selectedNode, null, connection, true);
			    		}
			    	}
			    	var index = graph.nodes.indexOf(that.selectedNode);
    		    	graph.nodes.splice(index, 1);

    				that.changed = true;
    				return;
    			}
            }
			that.selectedNode = null;
			that.changed = true;
		} else if (spos != null) {
			var nextPos = {"x":x+RenderEngine.getOffsetX(), "y":y+RenderEngine.getOffsetY()};
			RenderEngine.move(nextPos.x - spos.x, nextPos.y - spos.y);
		}
	};

	function updateGraph(inputNode, outputNode, inputName, outputName, force) {
		force = typeof force !== 'undefined' ? force : false;
		var toRemove = [];
		graph.connections.forEach(function(connection) {
			if (inputNode != null && connection.output.node == inputNode.name && connection.output.input == inputName) {
				var allowedToRemove = true;
				if (force == false) {
					that.nodes.forEach(function(node) {
						if (node.code == inputNode.code) {
							if(node.loopback != null && (node.loopback.indexOf(inputName) > -1)) {
								allowedToRemove = false;
							}
						}
					});
				}
				if (allowedToRemove == true) {
					toRemove.push(connection);
				}
			}
        });
        if (inputNode == null) {
		    graph.connections.forEach(function(connection) {
			    if (outputNode != null && connection.input.node == outputNode.name && connection.input.output == outputName) {
				    toRemove.push(connection);
			    }
            });
        }
		toRemove.forEach(function(elem) {
			var index = graph.connections.indexOf(elem);
    		graph.connections.splice(index, 1);
		});

		if (inputNode != null && outputNode != null && inputName != null && outputName != null) {
			graph.connections.push({"input":{"node":outputNode.name, "output": outputName}, "output":{"node":inputNode.name, "input": inputName}});
		}
        RenderEngine.setDirty();
	}
    
    function showInfo() {
        if (RenderEngine.showInfo == true) {
            RenderEngine.showInfo = false;
            var offset_px = (parseFloat(getComputedStyle(document.getElementById("graphview")).fontSize) * 18);
            var percent_screen_px = window.innerWidth * 0.3;
            document.getElementById("graphview").style.right = Math.max(offset_px, percent_screen_px) + "px";
            document.getElementById("rightside").style.width = Math.max(offset_px, percent_screen_px) + "px";
            document.getElementById("hider").style.zIndex = 100;
            document.getElementById("expander").style.zIndex = -100;
            RenderEngine.resize();
        }
    }
    
    function hideInfo() {
        if (RenderEngine.showInfo == false) {
            RenderEngine.showInfo = true;
            document.getElementById("graphview").style.right = "0";
            document.getElementById("infocontent").innerHTML = "Click/Tap on a node to show info about it.";
            document.getElementById("hider").style.zIndex = -100;
            document.getElementById("expander").style.zIndex = 100;
            that.currentNode = null;
            RenderEngine.marked = null;
            RenderEngine.resize();
        }
    }
    
    var lastDebug = "";

    this.hideInfo = hideInfo;
    this.showInfo = showInfo;

    this.setDebug = function (result) {
        if (lastDebug == result) {
            return;
        }
        lastDebug = result;
        showInfo();
        result = result.replace(new RegExp("<", 'g'), "&lt;");
        result = result.replace(new RegExp(">", 'g'), "&gt;");
        result = result.replace(new RegExp("\n", 'g'), "<br>");
        document.getElementById("debugcontent").innerHTML = "<button class='button outputnode right' onclick='WebUI.clearDebug()'>CLEAR</button><br>" + result;
    }
    
    this.killDebug = function() {
        kill();
        document.getElementById("killbtn").style.display = "none";
        document.getElementById("restartbtn").style.display = "none";
        document.getElementById("startbtn").style.display = "inline-block";
        console.log("Done");
        that.graphRunning = false;
    }
    
    this.clearDebug = function () {
        lastDebug = "";
        document.getElementById("debugcontent").innerHTML = "Run graph to get debug output.";
    }
    
    this.restartDebug = function() {
        that.killDebug();
        window.setTimeout(that.startDebugForceSave,1000);
    }

    this.startDebugForceSave = function() {
        that.startDebug(true);
    }
    
    this.startDebug = function(forceSave) {
        var startup = function() {
            var passwd = "wasd"; // TODO generate randomly
            that.graphRunning = true;
            document.getElementById("killbtn").style.display = "inline-block";
            document.getElementById("restartbtn").style.display = "inline-block";
            document.getElementById("startbtn").style.display = "none";
            that.setDebug("Started Graph: " + that.graphName);
	        start(that.graphName, that.currentLanguage, that.printError);
        };
        
        RenderEngine.resetHeat();
        if (that.changed == true) {
            if (forceSave) {
			    WebUI.saveGraph(WebUI.graphName);
			    that.changed = false;
                startup();
            } else {
			    WebUI.prompt("Autosave: Please enter graph name", WebUI.graphName,
                function(name) {
                    if (name == null) {
				        return;
			        }
			        WebUI.graphName = name;
			        WebUI.saveGraph(WebUI.graphName);
			        that.changed = false;
                    startup()
                }
                );
            }
			
        } else {
            startup();
        }
        
    }
}

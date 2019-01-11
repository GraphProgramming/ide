function CDebugger(entanglement, ui, renderer) {
    var that = this;
    
    this.onDebugMsg = function(line) {
        if(line != "") {
            var d = line.split(":");
            var node = d[0].split("_")[1];
            var data_type = d[1];
            var data_data = "";
            for (var i = 2; i < d.length; i++) {
                if (i > 2) {
                    data_data += ":" + d[i];
                } else {
                    data_data += d[i];
                }
            }
            if (data_type == "running") {
                var node_obj = ui.findNode(node);
                if (node_obj == null) {
                    console.log("Cannot find node: " + node);
                } else {
                    renderer.cooldown();
                    var data_obj = JSON.parse(data_data);
                    node_obj.heat = data_obj["heat"];
                    if (data_obj["state"]) {
                        node_obj.running = 20;
                    } else {
                        node_obj.running = 19;
                    }
                    renderer.cooldown();
                    renderer.setDirty();
                }
            } else if (data_type == "json") {
                var node_obj = ui.findNode(node);
                if (node_obj == null) {
                    console.log("Cannot find node: " + node);
                } else {
                    var data_obj = JSON.parse(data_data);
                    node_obj.data = data_obj;
                    renderer.setDirty();
                }
            } else if (data_type == "img") {
                var node_obj = ui.findNode(node);
                if (node_obj == null) {
                    console.log("Cannot find node: " + node);
                } else {
                    node_obj.data = "image";
                    node_obj.data_str = data_data;
                    renderer.setDirty();
                }
            } else {
                console.log(line);
                console.log(data_type);
                console.log(data_data);
            }
        }
    };
    
    this.continueBreakpoint = function(node_name) {
        entanglement.remote_fun("debug")("continue_"+node_name);
    };
}

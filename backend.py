import traceback
import datetime
import os
from time import sleep, time, strftime, gmtime
from threading import Thread
from functools import partial
import GPUtil as GPU
import subprocess
import time
import socket
import signal
from gpm.__main__ import GPM_HOME, get_path

TICKRATE = 0.3


class State(object):
    def __init__(self):
        self.result = None


def try_read(filename):
    try:
        with open(filename, 'r') as f:
            return f.read()
    except:
        return None

class Server(object):
    def __init__(self, config):
        self.config = config
        self.gpu_free = False
        self.running = True
        self.current_task = None
        self.execProcess = None
        self.debug_sock = None
        self.entanglements = []
        self.result = ""
        Thread(target=self.run).start()

    def run(self):
        while self.running:
            # TODO something that needs to be ticked even if no client is connected
            sleep(10)

    def pollPipe(self):
        while self.execProcess is not None:
            line = self.execProcess.stdout.readline().decode("utf-8")
            if line != '':
                #the real code does filtering here
                self.result = self.result + line.rstrip() + "\n"
            else:
                break
        self.execProcess = None


    def pollErrPipe(self):
        while self.execProcess is not None:
            line = self.execProcess.stderr.readline().decode("utf-8")
            if line != '':
                #the real code does filtering here
                self.result = self.result + line.rstrip() + "\n"
            else:
                break
        self.execProcess = None

    def debugger(self):
        time.sleep(1)
        s = socket.socket()
        connected = False
        i = 0
        while not connected and i < 3:
            try:
                s.connect(("localhost", 25923))
                connected = True
            except:
                print("Connection refused")
                i += 1
                time.sleep(1)
        if i >= 3:
            print("Connection refused completely.")
            return
        self.debug_sock = s
        print("Connected")
        sf = s.makefile()
        while True:
            try:
                line = sf.readline().replace("\n", "").replace("\r", "")
                if line == "":
                    print("Connection closed")
                    break
                for entanglement in self.entanglements:
                    entanglement.remote_fun("on_debug_msg")(line)
            except Exception as e:
                print("Closed with error.")
                print(e)
                break
        s.close()
        self.debug_sock = None
        for entanglement in self.entanglements:
            entanglement.remote_fun("on_kill")()

    def setup(self, state, entanglement):
        self.entanglements.append(entanglement)
        state.username = entanglement.username
        print(state.username)
        entanglement.on_close = partial(self.on_close, state, entanglement)
        entanglement.get_src = partial(self.get_src, state, entanglement)
        entanglement.set_src = partial(self.set_src, state, entanglement)
        entanglement.list_graphs = partial(self.list_graphs, state, entanglement)
        entanglement.get_graph = partial(self.get_graph, state, entanglement)
        entanglement.set_graph = partial(self.set_graph, state, entanglement)
        entanglement.get_nodes = partial(self.get_nodes, state, entanglement)
        entanglement.start = partial(self.start, state, entanglement)
        entanglement.kill = partial(self.kill, state, entanglement)

    def node_path(self, state, filename):
        filename, x = filename.split(":")
        filename += "." + x.split(".")[-1]
        node = filename.replace(".", "/").replace("/lua", ".lua").replace("/py", ".py")
        if node.split("/")[1] in ["stdlib", "extlib"]:
            path = GPM_HOME.replace("\\", "/") + "/" + node
        else:
            # TODO maybe consider user that is logged in?
            path = "/".join(node.split("/")[1:])
        print(os.path.dirname(path))
        return path

    def get_src(self, state, entanglement, filename):
        path = self.node_path(state, filename)
        entanglement.remote_fun("on_get_src")(try_read(path))

    def set_src(self, state, entanglement, filename, src):
        path = self.node_path(state, filename)
        if not os.path.exists(os.path.dirname(path)) and len(path.replace("\\", "/").split("/")) > 1:
            try:
                os.makedirs(os.path.dirname(path))
            except OSError as exc: # Guard against race condition
                if exc.errno != errno.EEXIST:
                    print(exc)
        with open(path, "w") as f:
            f.write(src)
        entanglement.remote_fun("on_set_src")(filename)

    def list_graphs(self, state, entanglement):
        graphs = []
        for root, dirs, files in os.walk(u'.'):
            for f in files:
                if f.endswith('.graph.json'):
                    graphs.append(os.path.join(root, f))
        entanglement.remote_fun("on_list_graphs")(graphs)

    def get_graph(self, state, entanglement, graph):
        path = graph + ".graph.json"
        entanglement.remote_fun("on_get_graph")(try_read(path))

    def set_graph(self, state, entanglement, graph, data):
        with open(graph + ".graph.json", "w") as f:
            f.write(data)
        entanglement.remote_fun("on_set_graph")(graph)

    def get_nodes(self, state, entanglement, language):
        print(f"Get Nodes for: {language}")
        try:
            ret = subprocess.check_output(["bash", GPM_HOME + "/ide/buildSpec", language])
            print(ret.decode("utf-8"))
        except:
            ret = subprocess.check_output([os.path.join(GPM_HOME, "ide", "buildSpec.bat"), language])
            print(ret.decode("utf-8"))
        path = language + ".nodes.json"
        entanglement.remote_fun("on_get_nodes")(try_read(path))

    def start(self, state, entanglement, graph, language):
        print(("Starting: " + graph))
        if self.execProcess is not None:
            entanglement.remote_fun("on_start")("Canot start 2 processes.")
        cmd = graph + ".graph.json"
        preex = None
        if language == "luaGP":
            try:
                preex = os.setsid
            except AttributeError:
                print("Windows: Feature not availible.")
            cmd = [os.path.join(GPM_HOME, "luaGP", "graphex") + " " + cmd + " debug"]
        else:
            try:
                preex = os.setsid
                cmd = ["python -m gpm.pyGP " + cmd + " --debug"]
            except AttributeError:
                print("Windows: Feature not availible.")
                cmd = ["python", "-m", "gpm.pyGP", cmd, "--debug"]
        self.execProcess = subprocess.Popen(
            cmd,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                shell=True, preexec_fn=preex,
                env=os.environ)
        self.result = ""
        Thread(target=self.pollPipe).start()
        Thread(target=self.pollErrPipe).start()
        Thread(target=self.debugger).start()
        entanglement.console = self.result

    def kill(self, state, entanglement):
        if self.execProcess is not None:
            try:
                os.killpg(self.execProcess.pid, signal.SIGTERM)
            except AttributeError:
                print("Windows: Feature not availible.")

    def tick(self, state, entanglement):
        if self.result != state.result:
            state.result = self.result
            entanglement.console = self.result.replace("\n", "<BR>")
            #print(self.result)

    def on_entangle(self, entanglement):
        state = State()
        self.setup(state, entanglement)
        try:
            while entanglement in self.entanglements:
                self.tick(state, entanglement)
                sleep(TICKRATE)
        except:
            with open("exceptions.log", "a") as log:
                log.write("%s: Exception occurred:\n" % datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                traceback.print_exc(file=log)

        self.on_close(state, entanglement)
        entanglement.close()

    def on_close(self, state, entanglement):
        if entanglement in self.entanglements:
            self.entanglements.remove(entanglement)

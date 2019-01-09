import traceback
import datetime
from time import sleep, time, strftime, gmtime
from threading import Thread
from functools import partial
import GPUtil as GPU


TICKRATE = 0.2


class Server(object):
    def __init__(self, config):
        self.config = config
        self.gpu_free = False
        self.running = True
        self.current_task = None
        self.username = None
        Thread(target=self.run).start()

    def run(self):
        while self.running:
            # TODO something that needs to be ticked even if no client is connected
            sleep(10)

    def setup(self, state, entanglement):
        self.username = entanglement.username
        print(self.username)
        entanglement.my_fun = partial(self.my_fun, state, entanglement)

    def my_fun(self, state, entanglement, name):
        pass

    def tick(self, state, entanglement):
        # TODO tick with entanglement
        #entanglement.remote_fun("update_server_status")("busy")
        pass

    def on_entangle(self, entanglement):
        state = {}
        self.setup(state, entanglement)
        try:
            while True:
                self.tick(state, entanglement)
                sleep(TICKRATE)
        except:
            with open("exceptions.log", "a") as log:
                log.write("%s: Exception occurred:\n" % datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                traceback.print_exc(file=log)

        entanglement.close()

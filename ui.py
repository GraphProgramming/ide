import platform
import sys
import os
from cefpython3 import cefpython as cef
        

folder = os.path.dirname(os.path.realpath(__file__)).replace("\\", "/")


def main():
    check_versions()
    sys.excepthook = cef.ExceptHook  # To shutdown all CEF processes on error
    cef.Initialize()
    cef.CreateBrowserSync(url='file:///'+ folder + '/sites/index.html',
                          window_title="Graph Programming IDE")
    cef.MessageLoop()
    cef.Shutdown()


def check_versions():
    ver = cef.GetVersion()
    print("[hello_world.py] CEF Python {ver}".format(ver=ver["version"]))
    print("[hello_world.py] Chromium {ver}".format(ver=ver["chrome_version"]))
    print("[hello_world.py] CEF {ver}".format(ver=ver["cef_version"]))
    print("[hello_world.py] Python {ver} {arch}".format(
           ver=platform.python_version(),
           arch=platform.architecture()[0]))
    assert cef.__version__ >= "57.0", "CEF Python v57.0+ required to run this"


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--path":
            print(folder + '/sites/index.html')
        else:
            print("Wrong usage: python -m gpm.ide.ui [--path]")
    else:
        main()

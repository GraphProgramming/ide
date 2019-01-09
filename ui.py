import platform
import sys
import os
from cefpython3 import cefpython as cef
        

folder = os.path.dirname(os.path.realpath(__file__)).replace("\\", "/")


def main():
    sys.excepthook = cef.ExceptHook  # To shutdown all CEF processes on error
    settings = {
        "cache_path": ".cache"
    }
    cef.Initialize(settings)
    cef.CreateBrowserSync(url='file:///'+ folder + '/sites/index.html',
                          window_title="Graph Programming IDE")
    cef.MessageLoop()
    cef.Shutdown()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--path":
            print(folder + '/sites/index.html')
        else:
            print("Wrong usage: python -m gpm.ide.ui [--path]")
    else:
        main()

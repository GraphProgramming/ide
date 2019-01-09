import webbrowser
import os
import subprocess
from subprocess import CalledProcessError

if __name__ == "__main__":
    folder = os.path.dirname(os.path.realpath(__file__)).replace("\\", "/")
    try:
        subprocess.check_call('npm install && npm start', shell=True, cwd=folder + "/electron")
    except CalledProcessError as e:
        if e.returncode == 127:
            webbrowser.open('file:///'+ folder + '/sites/index.html')
        else:
            print(e)

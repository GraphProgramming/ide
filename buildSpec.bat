@echo off

if "%1"=="" goto other
if "%1"=="pyGP" goto pyGP
if "%1"=="luaGP" goto luaGP

goto other

:pyGP
  cd ../pyGP

  python buildNodespec.py %1
goto done

:luaGP
  cd ../luaGP

  luajit buildNodespec.lua %1
goto done

:other
  echo "Unknown language: " %1
goto done

:done
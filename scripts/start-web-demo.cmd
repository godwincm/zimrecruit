@echo off
setlocal

set PORT=%1
if "%PORT%"=="" set PORT=3002

cd /d "%~dp0.."
echo Starting ZimRecruit web on http://127.0.0.1:%PORT%
echo Logs: .next-web-%PORT%.log and .next-web-%PORT%.err.log

cd apps\web
node ..\..\node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port %PORT% >> ..\..\.next-web-%PORT%.log 2>> ..\..\.next-web-%PORT%.err.log

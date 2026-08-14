@echo off
setlocal

if exist "C:\msys64\mingw64\bin\npm.cmd" (
    set "PATH=C:\msys64\mingw64\bin;%PATH%"
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-webui.ps1" %*
set "SYNC_WEBUI_EXIT_CODE=%ERRORLEVEL%"

endlocal & exit /b %SYNC_WEBUI_EXIT_CODE%

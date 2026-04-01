@echo off
title KineTube Launcher

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         KineTube Launcher            ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Starting Backend  (http://localhost:3001) ...
start "KineTube — Backend" cmd /k "cd /d "%~dp0backend" && npm install && node server.js"

timeout /t 2 /nobreak >nul

echo  Starting Frontend (http://localhost:5173) ...
start "KineTube — Frontend" cmd /k "cd /d "%~dp0frontend" && npm install && npm run dev"

echo.
echo  Both servers are starting in separate windows.
echo  Open http://localhost:5173 in your browser once both are ready.
echo.
pause

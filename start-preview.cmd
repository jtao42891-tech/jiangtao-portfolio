@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PORTFOLIO_NPM="
for /f "delims=" %%P in ('where npm.cmd 2^>nul') do if not defined PORTFOLIO_NPM set "PORTFOLIO_NPM=%%P"
if not defined PORTFOLIO_NPM if exist "%~dp0..\.tools\node\node-v22.12.0-win-x64\npm.cmd" (
  set "PORTFOLIO_NPM=%~dp0..\.tools\node\node-v22.12.0-win-x64\npm.cmd"
  set "PATH=%~dp0..\.tools\node\node-v22.12.0-win-x64;%PATH%"
)
if not defined PORTFOLIO_NPM if exist "%~dp0..\网站\.tools\node\node-v22.12.0-win-x64\npm.cmd" (
  set "PORTFOLIO_NPM=%~dp0..\网站\.tools\node\node-v22.12.0-win-x64\npm.cmd"
  set "PATH=%~dp0..\网站\.tools\node\node-v22.12.0-win-x64;%PATH%"
)
if not defined PORTFOLIO_NPM (
  echo Node.js 22.12+ and npm are required. Please install Node.js first.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call "%PORTFOLIO_NPM%" ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Preview: http://127.0.0.1:5173/
echo If it is already running, open the address above. Press Ctrl+C to stop this server.
call "%PORTFOLIO_NPM%" run dev
if errorlevel 1 pause

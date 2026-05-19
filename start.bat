@echo off
REM ============================================================
REM  RoleplaySystem launcher
REM  - Verifies prerequisites
REM  - Bootstraps deps / SillyTavern / .env on first run
REM  - Starts SillyTavern, orchestrator and web in 3 windows
REM ============================================================
cd /d "%~dp0"

echo.
echo === RoleplaySystem launcher ===
echo.

REM ---- prerequisites -----------------------------------------
where node >nul 2>nul
if errorlevel 1 goto :no_node

where pnpm >nul 2>nul
if errorlevel 1 goto :install_pnpm
goto :check_ollama

:install_pnpm
echo [!] pnpm not found, installing globally via npm...
call npm install -g pnpm@9
if errorlevel 1 goto :pnpm_failed

:check_ollama
where ollama >nul 2>nul
if errorlevel 1 echo [!] Ollama not found on PATH. The GM will fail until you install it from https://ollama.com/download

REM ---- first-run bootstrap -----------------------------------
if exist "node_modules" goto :skip_install
echo [+] Installing workspace dependencies...
call pnpm install
if errorlevel 1 goto :install_failed
:skip_install

if exist "vendor\SillyTavern\package.json" goto :skip_st_setup
echo [+] Setting up SillyTavern under vendor\...
call pnpm st:setup
if errorlevel 1 goto :st_failed
:skip_st_setup

if exist "vendor\sd-webui-forge\webui-user.bat" goto :skip_sd_setup
echo [+] Setting up SD WebUI Forge under vendor\...
call pnpm sd:setup
if errorlevel 1 echo [!] Forge setup failed (image gen will be unavailable until you fix it)
:skip_sd_setup

if exist ".env" goto :skip_env
echo [+] Creating .env from .env.example
copy /Y ".env.example" ".env" >nul
:skip_env

REM ---- Ollama daemon -----------------------------------------
where ollama >nul 2>nul
if errorlevel 1 goto :launch
curl -sf http://127.0.0.1:11434/api/version >nul 2>nul
if not errorlevel 1 goto :launch
echo [+] Starting Ollama daemon...
start "Ollama" /MIN cmd /c "ollama serve"
call :wait_ollama 10

REM ---- launch the three services -----------------------------
:launch
echo [+] Launching SillyTavern    (http://127.0.0.1:8000)
start "SillyTavern" cmd /k "cd /d %~dp0 && pnpm st"

echo [+] Launching orchestrator   (http://localhost:4000)
start "Orchestrator" cmd /k "cd /d %~dp0apps\orchestrator && pnpm dev"

echo [+] Launching web UI         (http://localhost:3000)
start "Web" cmd /k "cd /d %~dp0apps\web && pnpm dev"

if not exist "vendor\sd-webui-forge\webui-user.bat" goto :skip_sd_launch
echo [+] Launching SD WebUI Forge (http://127.0.0.1:7860)
start "SD Forge" cmd /k "cd /d %~dp0vendor\sd-webui-forge && webui-user.bat"
:skip_sd_launch

echo.
echo === Started. Close each window to stop a service. ===
echo     SillyTavern : http://127.0.0.1:8000
echo     Web UI      : http://localhost:3000
echo     Orchestrator: http://localhost:4000
echo     SD Forge    : http://127.0.0.1:7860  (if installed)
echo.
timeout /t 5 >nul
exit /b 0

REM ---- helpers / failure paths -------------------------------
:wait_ollama
set /a _tries=%1
:wait_loop
curl -sf http://127.0.0.1:11434/api/version >nul 2>nul
if not errorlevel 1 exit /b 0
set /a _tries-=1
if %_tries% leq 0 exit /b 1
timeout /t 1 /nobreak >nul
goto :wait_loop

:no_node
echo [x] Node.js not found. Install from https://nodejs.org
pause
exit /b 1

:pnpm_failed
echo [x] pnpm global install failed.
pause
exit /b 1

:install_failed
echo [x] pnpm install failed.
pause
exit /b 1

:st_failed
echo [x] SillyTavern setup failed.
pause
exit /b 1

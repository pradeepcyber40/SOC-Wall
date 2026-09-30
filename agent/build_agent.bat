@echo off
echo ===================================================
echo Building RasiSOC-Agent.exe using PyInstaller
echo ===================================================

cd /d "%~dp0"
pyinstaller --noconfirm --onefile --console --name "RasiSOC-Agent" rasi_agent.py

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] RasiSOC-Agent.exe built in dist\ directory!
) else (
    echo [ERROR] Build failed.
)

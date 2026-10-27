@echo off
rem Installs (or reapplies) the Lushy theme for Spotify. Run it again after Spotify updates itself.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause

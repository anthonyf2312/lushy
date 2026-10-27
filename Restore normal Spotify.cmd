@echo off
rem Removes Spicetify's changes, so Spotify looks and works as it did before the theme.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Restore
pause

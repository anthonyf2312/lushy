@echo off
rem Restarts Spotify with a debugging port that only this PC can reach (127.0.0.1:9222), so the
rem theme can be inspected and tried live. Close Spotify and open it normally when done; the port closes with it.
taskkill /IM Spotify.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "%APPDATA%\Spotify\Spotify.exe" --remote-debugging-port=9222

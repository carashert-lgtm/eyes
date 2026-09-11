@echo off
REM Double-click or run from cmd — avoids Windows opening .ps1 in Notepad.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0transfer-ownership-mainnet.ps1" -SafeAddress 0xbe5B4c6aC168107C25510469fF02cc0896015bfa
pause

@echo off
cd /d "%~dp0"
python phonekit.py
if errorlevel 1 pause

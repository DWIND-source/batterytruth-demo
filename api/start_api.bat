@echo off
rem BatteryTruth API: web app + battery health check + AI Coach on http://127.0.0.1:8787
cd /d "%~dp0\.."
if not exist ".venv-api\Scripts\python.exe" (
  python -m venv .venv-api
  ".venv-api\Scripts\python.exe" -m pip install -r api\requirements.txt
)
if "%ANTHROPIC_API_KEY%"=="" echo [i] ANTHROPIC_API_KEY is not set: the AI Coach will be off; the battery check still works.
start "" "http://127.0.0.1:8787/app/"
".venv-api\Scripts\python.exe" api\server.py

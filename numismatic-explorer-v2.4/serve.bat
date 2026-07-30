@echo off
python scripts\build_data.py
if errorlevel 1 (
  echo.
  echo The build failed. Review the error shown above.
  pause
  exit /b 1
)
start "" http://localhost:8000
python -m http.server 8000

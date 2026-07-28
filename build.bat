@echo off
python scripts\build_data.py
if errorlevel 1 (
  echo.
  echo The build failed. Review the error shown above.
  pause
  exit /b 1
)
echo.
echo Build completed successfully.
pause

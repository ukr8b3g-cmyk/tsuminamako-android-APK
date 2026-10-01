@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "GODOT=%~1"
if not defined GODOT set /p "GODOT=Godot Standard EXE のフルパスを入力してください: "
set "GODOT=%GODOT:"=%"
if not exist "%GODOT%" (
  echo Godot EXE が見つかりません。ダウンロードやインストールは行いません。
  pause
  exit /b 1
)
echo [1/4] Godot import / script validation...
"%GODOT%" --headless --path "%~dp0." --editor --import > "tests\native_import.log" 2>&1
if errorlevel 1 goto failed
findstr /C:"SCRIPT ERROR" /C:"Parse Error" /C:"Failed to load script" "tests\native_import.log" >nul
if not errorlevel 1 goto failed
echo [2/4] Native rule tests...
"%GODOT%" --headless --path "%~dp0." --script res://tests/test_rules.gd > "tests\native_rules.log" 2>&1
if errorlevel 1 goto failed
findstr /C:"SCRIPT ERROR" /C:"FAIL:" "tests\native_rules.log" >nul
if not errorlevel 1 goto failed
type "tests\native_rules.log"
echo [3/4] Native card reward flow tests...
"%GODOT%" --headless --path "%~dp0." --script res://tests/test_reward_flow.gd > "tests\native_reward_flow.log" 2>&1
if errorlevel 1 goto failed
findstr /C:"SCRIPT ERROR" /C:"FAIL:" "tests\native_reward_flow.log" >nul
if not errorlevel 1 goto failed
type "tests\native_reward_flow.log"
echo [4/4] Resume and completion tests...
"%GODOT%" --headless --path "%~dp0." --script res://tests/test_resume.gd > "tests\native_resume.log" 2>&1
if errorlevel 1 goto failed
findstr /C:"SCRIPT ERROR" /C:"FAIL:" "tests\native_resume.log" >nul
if not errorlevel 1 goto failed
type "tests\native_resume.log"
echo.
echo 完了。実画面の描画・音・Android実機は別途確認してください。
pause
exit /b 0
:failed
echo 検証で問題が見つかりました。次のログを確認してください。
if exist "tests\native_import.log" type "tests\native_import.log"
if exist "tests\native_resume.log" type "tests\native_resume.log"
if exist "tests\native_rules.log" type "tests\native_rules.log"
if exist "tests\native_reward_flow.log" type "tests\native_reward_flow.log"
pause
exit /b 1

@echo off
chcp 65001 >nul
title 餐猎 - 餐饮猎头平台
echo ========================================
echo  餐猎 - 餐饮酒店高端人才平台
echo  启动中...
echo ========================================
echo.

:: Kill old processes
taskkill /f /im node.exe 2>nul >nul

:: Start Backend
echo [1/2] 启动后端服务 (port 3001)...
start "餐猎-后端" cmd /c "cd /d %~dp0backend && npx tsx src/index.ts"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [2/2] 启动前端服务 (port 5173)...
start "餐猎-前端" cmd /c "cd /d %~dp0frontend && npx vite --host"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo  ✅ 启动完成！
echo.
echo  前端地址: http://localhost:5173
echo  手机访问: http://10.22.42.178:5173
echo         （需在同一WiFi下）
echo.
echo  管理员: 13800000000 / admin123
echo ========================================
echo.
pause

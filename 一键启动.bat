@echo off
chcp 65001 >nul
title 餐猎 - 餐饮猎头平台 - 一键启动
echo ========================================
echo  餐猎 - 餐饮酒店高端人才平台
echo  一键启动脚本
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [检测] Node.js 已安装
node -v
echo.

:: Install backend dependencies
if not exist "%~dp0backend\node_modules" (
    echo [1/4] 安装后端依赖...
    cd /d "%~dp0backend"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

:: Install frontend dependencies
if not exist "%~dp0frontend\node_modules" (
    echo [2/4] 安装前端依赖...
    cd /d "%~dp0frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

:: Initialize database
if not exist "%~dp0backend\prisma\dev.db" (
    echo [3/4] 初始化数据库...
    cd /d "%~dp0backend"
    call npx prisma db push
    call npx tsx src/seed.ts
    echo.
)

:: Kill old processes
echo [4/4] 启动服务...
taskkill /f /im node.exe 2>nul >nul

:: Start Backend
start "餐猎-后端" cmd /c "cd /d "%~dp0backend" && npx tsx src/index.ts"

:: Wait for backend
timeout /t 3 /nobreak >nul

:: Start Frontend with host flag for mobile access
start "餐猎-前端" cmd /c "cd /d "%~dp0frontend" && npx vite --host"

timeout /t 3 /nobreak >nul

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo ========================================
echo  ✅ 启动完成！
echo.
echo  电脑访问: http://localhost:5173
echo  手机访问: http://%LOCAL_IP%:5173
echo         （需在同一WiFi下）
echo.
echo  测试凭据不会显示在脚本中，请通过安全渠道获取。
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:5173

@echo off
REM 率土之滨助手 - Windows构建脚本

echo ======================================
echo  率土之滨助手 - 构建脚本
echo ======================================

set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=all

REM 构建前端
:build_frontend
if "%BUILD_TYPE%"=="backend" goto build_backend
if "%BUILD_TYPE%"=="taro" goto build_taro

echo.
echo [1/3] 构建前端...

call npm config set registry https://registry.npmmirror.com

REM 构建web前端
if exist "heroui-web" (
    echo 构建web前端...
    cd heroui-web
    call npm install
    call npm run build
    cd ..
    
    REM 复制到 web\dist 以便打包进 Go 二进制文件
    if exist "web\dist" rmdir /S /Q "web\dist"
    mkdir "web\dist"
    xcopy /E /Y "heroui-web\dist\*" "web\dist\"
    
    echo web前端构建完成!
)

REM 构建teamweb前端
if exist "teamweb" (
    echo 构建teamweb前端...
    cd teamweb
    call npm install
    call npm run build
    cd ..
    
    REM 复制teamweb构建结果
    echo 复制teamweb文件...
    
    if not exist "web\dist\data" mkdir web\dist\data
    xcopy /E /Y "teamweb\dist\*" "web\dist\data\"
    
    copy /Y "teamweb\dist\index.html" "web\dist\data.html"
    
    if exist "teamweb\dist\assets" (
        if not exist "web\dist\assets" mkdir web\dist\assets
        xcopy /E /Y "teamweb\dist\assets\*" "web\dist\assets\"
    )
    
    echo teamweb前端构建并复制完成!
)

REM 构建Taro / Mobile
:build_taro
if not "%BUILD_TYPE%"=="taro" if not "%BUILD_TYPE%"=="all" goto build_backend
if "%BUILD_TYPE%"=="frontend" goto build_backend

echo.
echo [Mobile] 构建移动端应用...

if exist "web-mobile" (
    echo 构建移动端...
    cd web-mobile
    call npm install
    call npm run build
    cd ..
    
    if not exist "web\dist\m" mkdir "web\dist\m"
    xcopy /E /Y "web-mobile\dist\*" "web\dist\m\"
    
    echo 移动端构建完成: web\dist\m\
)

if "%BUILD_TYPE%"=="taro" goto end

REM 构建后端
:build_backend
echo.
echo [2/3] 构建后端...

REM 检查前端是否已构建
if not exist "web\dist" (
    echo 错误: web\dist 目录不存在，请先构建前端
    echo 运行: build.bat frontend
    exit /b 1
)

REM 下载依赖
echo 下载Go依赖...
set GOPROXY=https://goproxy.cn,direct
go mod tidy

REM 构建Windows版本
echo 编译Windows amd64版本...
set GOOS=windows
set GOARCH=amd64
go build -ldflags="-s -w" -o stzbhelper-windows-amd64.exe .

REM 构建Linux版本
echo 编译Linux amd64版本...
set GOOS=linux
set GOARCH=amd64
go build -ldflags="-s -w" -o stzbhelper-linux-amd64 .

echo 后端构建完成!
echo 输出文件:
dir stzbhelper-*.* 2>nul

:end
echo.
echo ======================================
echo  构建完成!
echo ======================================
echo.
echo 部署文件结构：
echo   stzbhelper-windows-amd64.exe - Windows后端程序
echo   stzbhelper-linux-amd64       - Linux后端程序
echo   web\dist\                    - 管理后台前端(PC端)
echo   web\dist\m\                  - Mobile移动端前端
echo   web\dist\data.html           - 队伍查询入口
echo   web\dist\data\               - 队伍查询目录
echo.
echo 访问地址：
echo   http://localhost:9627/       - 管理后台(PC端)
echo   http://localhost:9627/m/     - 移动端(Mobile)
echo   http://localhost:9627/data.html - 队伍查询
echo.

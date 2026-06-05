@echo off
echo.
echo ===================================================
echo QR Verde Paranagua - Backend de Noticias
echo ===================================================
echo.

REM Verifica se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao esta instalado!
    echo.
    echo Download em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verifica se node_modules existe
if not exist "node_modules" (
    echo [INSTALANDO] Dependencias...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
    echo.
)

REM Inicia o servidor
echo [INICIANDO] Servidor em http://localhost:3000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
call npm start

pause

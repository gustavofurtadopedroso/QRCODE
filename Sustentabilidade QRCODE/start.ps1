# QR Verde Paranagua - Backend de Noticias (PowerShell)

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "QR Verde Paranagua - Backend de Noticias" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Node.js nao esta instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Download em: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit
}

# Verifica se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "[INSTALANDO] Dependencias..." -ForegroundColor Yellow
    Write-Host ""
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar dependencias" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit
    }
    Write-Host ""
}

# Inicia o servidor
Write-Host "[INICIANDO] Servidor em http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Abra o navegador e acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar o servidor: Ctrl+C" -ForegroundColor Yellow
Write-Host ""

npm start

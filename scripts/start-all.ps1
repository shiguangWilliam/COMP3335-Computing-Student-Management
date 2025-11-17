param(
    [switch]$ResetData,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptsDir = Join-Path $projectRoot "scripts"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMP3335 Launch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/4] Starting Percona Database (New Window)..." -ForegroundColor Yellow
$resetArg = if ($ResetData) { "-ResetData" } else { "" }
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$scriptsDir'; Write-Host '[Database] Starting Percona...' -ForegroundColor Cyan; .\setup-percona.ps1 $resetArg"
Write-Host "    Database will start in a new PowerShell window" -ForegroundColor Green

Write-Host "`n[Waiting] Database Initialization (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

if (-not $SkipSeed) {
    Write-Host "`n[2/4] Generating Test Account Data (New Window)..." -ForegroundColor Yellow
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; Write-Host '[Data Generation] Generating test data...' -ForegroundColor Cyan; .\mvnw -q compile exec:java '-Dexec.mainClass=scripts.TestAccountSeeder'; Write-Host '`nData generation complete, press any key to close...' -ForegroundColor Green; Read-Host"
    Write-Host "    Test data will be generated in a new PowerShell window" -ForegroundColor Green
    Write-Host "    (Wait for data generation to complete before accessing the system)" -ForegroundColor Gray
} else {
    Write-Host "`n[2/4] Skipping Test Data Generation (-SkipSeed)" -ForegroundColor Gray
}

Write-Host "`n[3/4] Starting Spring Boot Backend (New Window)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; Write-Host '[Backend Server] Starting Spring Boot...' -ForegroundColor Cyan; .\mvnw spring-boot:run"
Write-Host "    Backend will start in a new PowerShell window" -ForegroundColor Green

Write-Host "`n[4/4] Starting Next.js Frontend (New Window)..." -ForegroundColor Yellow
$npmInstallCmd = if (Test-Path "$frontendDir\node_modules") { "" } else { "Write-Host 'Installing dependencies...' -ForegroundColor Yellow; npm install; " }
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; Write-Host '[Frontend Server] Starting Next.js...' -ForegroundColor Cyan; $npmInstallCmd npm run dev"
Write-Host "    Frontend will start in a new PowerShell window" -ForegroundColor Green
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  All services are up and running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend: http://localhost:3335" -ForegroundColor White
Write-Host "  Database: localhost:3306 (root/!testCOMP3335)" -ForegroundColor White
Write-Host ""
Write-Host "Test Accounts:" -ForegroundColor Cyan
Write-Host "  student@test.local   / Test@12345  (Student)" -ForegroundColor White
Write-Host "  guardian@test.local  / Guardian@12345  (Guardian)" -ForegroundColor White
Write-Host "  aro@test.local       / Aro@12345  (ARO)" -ForegroundColor White
Write-Host "  dro@test.local       / Dro@12345Ea(DRO)" -ForegroundColor White
Write-Host ""
Write-Host "Notes:" -ForegroundColor Cyan
Write-Host "  - Backend and frontend run in separate windows for real-time logs" -ForegroundColor Gray
Write-Host "  - run .\scripts\stop-all.ps1 to stop all services" -ForegroundColor Gray
Write-Host ""

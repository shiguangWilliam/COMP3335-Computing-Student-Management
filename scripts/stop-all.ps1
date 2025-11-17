$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stop all COMP3335 services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Stopping PowerShell background jobs..." -ForegroundColor Yellow
$jobs = Get-Job | Where-Object { $_.State -eq 'Running' }
if ($jobs) {
    $jobs | Stop-Job
    $jobs | Remove-Job -Force
    Write-Host "    Stopped $($jobs.Count) background jobs" -ForegroundColor Green
} else {
    Write-Host "    No running background jobs" -ForegroundColor Gray
}

Write-Host "`n[2/3] Stopping database container..." -ForegroundColor Yellow
$containerName = "comp3335-db"
$existing = docker ps -q -f "name=$containerName"
if ($existing) {
    docker stop $containerName | Out-Null
    Write-Host "    Container $containerName stopped" -ForegroundColor Green
} else {
    Write-Host "    Container $containerName is not running" -ForegroundColor Gray
}

Write-Host "`n[3/3] Checking port usage..." -ForegroundColor Yellow
$ports = @(3000, 3335, 3306)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
               Select-Object -ExpandProperty OwningProcess -First 1
    if ($process) {
        $procName = (Get-Process -Id $process -ErrorAction SilentlyContinue).ProcessName
        Write-Host "    Port $port is occupied by process $procName (PID: $process)" -ForegroundColor Yellow
        Write-Host "    To terminate manually: Stop-Process -Id $process -Force" -ForegroundColor Gray
    } else {
        Write-Host "    Port $port is not in use" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  All services have been stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

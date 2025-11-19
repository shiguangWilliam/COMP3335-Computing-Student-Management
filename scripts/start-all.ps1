param(
    [switch]$ResetData,
    [switch]$SkipSeed,
    [string]$DockerDir = ""
)

$ErrorActionPreference = "Stop"

function Wait-DockerReady {
    param(
        [int]$TimeoutSeconds = 300,
        [int]$IntervalSeconds = 5
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if (docker info 2>$null) {
            return $true
        }

        $elapsed = [int]$stopwatch.Elapsed.TotalSeconds
        Write-Host "    Waiting for Docker... (${elapsed}s/${TimeoutSeconds}s)" -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
    }

    return $false
}

function Test-PortAvailability {
    param(
        [int[]]$Ports
    )

    foreach ($port in $Ports) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        } catch {
            Write-Host "    Unable to inspect port $port automatically. Please ensure it is free." -ForegroundColor Yellow
            continue
        }

        if ($connections) {
            $processIds = ($connections | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
            Write-Host "    Port $port is occupied (process ID: $processIds)." -ForegroundColor Red
            return $false
        }
    }

    return $true
}

function Wait-ContainerRunning {
    param(
        [string]$ContainerName,
        [int]$TimeoutSeconds = 180,
        [int]$IntervalSeconds = 5
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $containerId = docker ps -a -q -f "name=$ContainerName"
        if ($containerId) {
            $state = docker inspect --format '{{.State.Status}}' $ContainerName 2>$null
            if ($state -eq "running") {
                return $true
            }
            Write-Host "    Container $ContainerName state: $state (waiting)..." -ForegroundColor Gray
        } else {
            Write-Host "    Waiting for container $ContainerName to be created..." -ForegroundColor Gray
        }

        Start-Sleep -Seconds $IntervalSeconds
    }

    return $false
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptsDir = Join-Path $projectRoot "scripts"
$frontendDir = Join-Path $projectRoot "frontend"
$dbContainerName = "comp3335-db"
$requiredPorts = @(3000, 3335, 3306)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMP3335 Launch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 预检查：关键端口占用情况
Write-Host "`n[Pre-Checking] Checking required ports (${($requiredPorts -join ', ')})..." -ForegroundColor Yellow
if (-not (Test-PortAvailability -Ports $requiredPorts)) {
    Write-Host "    Detected port conflicts. Please free the ports and rerun the script." -ForegroundColor Red
    exit 1
}

# 步骤 0: 检查并启动 Docker Desktop
Write-Host "`n[0/4] Checking Docker Desktop..." -ForegroundColor Yellow
$DataBasePort = 3306
if (-not (Test-PortAvailability -Ports @($DataBasePort))) {
    Write-Host "    DataBase requires port $DataBasePort but it is currently in use. Please free the port and rerun the script." -ForegroundColor Red
    exit 1
}
$FrontEndPort = 3000
if (-not (Test-PortAvailability -Ports @($FrontEndPort))) {
    Write-Host "    FrontEnd requires port $FrontEndPort but it is currently in use. Please free the port and rerun the script." -ForegroundColor Red
    exit 1
}
$BackendPort = 3335
if (-not (Test-PortAvailability -Ports @($BackendPort))) {
    Write-Host "    Backend requires port $BackendPort but it is currently in use. Please free the port and rerun the script." -ForegroundColor Red
    exit 1
}
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "    Docker Desktop is not running, starting..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "    Waiting for Docker Desktop to become ready..." -ForegroundColor Cyan
    $dockerReady = Wait-DockerReady
    if (-not $dockerReady) {
        throw "Docker Desktop failed to start. Please start it manually and try again."
    }
    Write-Host "    Docker Desktop is ready" -ForegroundColor Green
} else {
    Write-Host "    Docker Desktop is already running" -ForegroundColor Green
}

Write-Host "`n[1/4] Starting Percona Database (New Window)..." -ForegroundColor Yellow
$setupArgs = @()
if ($ResetData) { $setupArgs += "-ResetData" }
if ($DockerDir) { $setupArgs += "-DockerDir '$DockerDir'" }
$setupArgsStr = $setupArgs -join " "
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$scriptsDir'; Write-Host '[Database] Starting Percona...' -ForegroundColor Cyan; .\setup-percona.ps1 $setupArgsStr"
Write-Host "    Database will start in a new PowerShell window" -ForegroundColor Green

Write-Host "`n[Waiting] Ensuring Percona container is running..." -ForegroundColor Yellow
$perconaReady = Wait-ContainerRunning -ContainerName $dbContainerName -TimeoutSeconds 300
if (-not $perconaReady) {
    throw "Percona container '$dbContainerName' did not reach running state in time. Please investigate its startup window."
}
Write-Host "    Percona container is running" -ForegroundColor Green

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

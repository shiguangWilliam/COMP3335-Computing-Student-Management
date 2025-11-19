param(
    [switch]$ResetData,
    [string]$DockerDir = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

# 使用自定义 Docker 根目录或默认路径
$dockerDir = if ($DockerDir) { Join-Path $DockerDir "docker" } else { Join-Path $projectRoot "docker" }
$dataDir = Join-Path $dockerDir "data"
$keyringDir = Join-Path $dockerDir "keyring"
$configPath = Join-Path $dockerDir "my.cnf"
$initSql = Join-Path $projectRoot "init_database.sql"
$containerName = "comp3335-db"

Write-Host "==> Preparing directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $dockerDir | Out-Null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $keyringDir | Out-Null

if (-not (Test-Path $configPath)) {
    @"
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/keyring/keyring
"@ | Set-Content -Encoding UTF8 $configPath
    Write-Host "    Created docker\my.cnf" -ForegroundColor Green
} else {
    Write-Host "    docker\my.cnf already exists, skipping" -ForegroundColor Yellow
}

if ($ResetData) {
    Write-Host "==> ResetData enabled: clearing data/keyring directories..." -ForegroundColor Cyan
    Get-ChildItem $dataDir -Force -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    Get-ChildItem $keyringDir -Force -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
}

Write-Host "==> Checking existing container..." -ForegroundColor Cyan
$existing = docker ps -a -q -f "name=$containerName"
if ($existing) {
    Write-Host "    Removing old container $containerName" -ForegroundColor Yellow
    docker rm -f $containerName | Out-Null
}

if (-not (Test-Path $initSql)) {
    throw "init_database.sql is missing; cannot continue"
}

$pwdEscaped = $projectRoot -replace "\\", "/"
$dockerCmd = @(
    "run",
    "--name", $containerName,
    "-p", "3306:3306",
    "-p", "33060:33060",
    "-e", "MYSQL_ROOT_PASSWORD=!testCOMP3335",
    "-e", "MYSQL_DATABASE=COMP3335",
    "-v", "$pwdEscaped/docker/data:/var/lib/mysql",
    "-v", "$pwdEscaped/docker/keyring:/keyring",
    "-v", "$pwdEscaped/init_database.sql:/docker-entrypoint-initdb.d/init_database.sql",
    "percona/percona-server:latest",
    "--early-plugin-load=keyring_file.so",
    "--keyring_file_data=/keyring/keyring"
)

Write-Host "==> Starting Percona container..." -ForegroundColor Cyan
Write-Host "    Docker directory: $dockerDir" -ForegroundColor Gray
Write-Host "    Data directory: $dataDir" -ForegroundColor Gray
Write-Host "    Keyring directory: $keyringDir" -ForegroundColor Gray
Write-Host "    Configuration file: $configPath" -ForegroundColor Gray
Write-Host "    Initialization script: $initSql" -ForegroundColor Gray
docker @dockerCmd

Write-Host "`nCompleted. You can verify with:" -ForegroundColor Green
Write-Host '  docker exec comp3335-db mysql -uroot -p!testCOMP3335 -e "SHOW DATABASES;"'


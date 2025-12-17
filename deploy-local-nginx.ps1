#!/usr/bin/env powershell
# Deploy to Local Windows nginx
# Usage: .\deploy-local-nginx.ps1

$nginxPath = "C:\Users\rajes\Downloads\nginx-1.29.4"
$projectPath = "C:\Users\rajes\PycharmProjects\ing-llm-testing"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Broker Fee Comparator - Local Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify nginx exists
if (-not (Test-Path $nginxPath)) {
    Write-Host "ERROR: nginx not found at $nginxPath" -ForegroundColor Red
    exit 1
}

# Build application
Write-Host "Building application..." -ForegroundColor Yellow
Push-Location $projectPath
npm run build 2>&1 | Out-Null
$buildStatus = $LASTEXITCODE
Pop-Location

if ($buildStatus -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful" -ForegroundColor Green

# Test nginx config
Write-Host "Testing nginx configuration..." -ForegroundColor Yellow
Push-Location $nginxPath
.\nginx.exe -t 2>&1 | Out-Null
$testStatus = $LASTEXITCODE
Pop-Location

if ($testStatus -ne 0) {
    Write-Host "nginx configuration has errors!" -ForegroundColor Red
    exit 1
}
Write-Host "nginx configuration is valid" -ForegroundColor Green

# Stop existing nginx
Write-Host "Stopping existing nginx..." -ForegroundColor Yellow
Get-Process nginx -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# Start nginx
Write-Host "Starting nginx..." -ForegroundColor Yellow
Push-Location $nginxPath
Start-Process -FilePath ".\nginx.exe" -WindowStyle Hidden
Start-Sleep -Seconds 2
Pop-Location

# Verify nginx is running
$nginxProcess = Get-Process nginx -ErrorAction SilentlyContinue
if ($nginxProcess) {
    Write-Host "nginx started successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to start nginx!" -ForegroundColor Red
    exit 1
}

# Verify application is accessible
Write-Host "Verifying application..." -ForegroundColor Yellow
$retries = 0
$maxRetries = 5
$success = $false

while ($retries -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $success = $true
            break
        }
    } catch {
        $retries++
        if ($retries -lt $maxRetries) {
            Write-Host "  Waiting for server... (attempt $retries/$maxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
    }
}

Write-Host ""
if ($success) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application is running at: http://localhost" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop nginx:  cd $nginxPath; .\nginx.exe -s stop" -ForegroundColor Gray
    Write-Host "To reload:      cd $nginxPath; .\nginx.exe -s reload" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Deployment failed - application not responding" -ForegroundColor Red
    Write-Host "Check nginx error log for details" -ForegroundColor Yellow
    exit 1
}

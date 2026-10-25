# ============================================================
# Local Development Startup Script for Spring Boot Backend
# ============================================================

$BackendDir = $PSScriptRoot
Set-Location $BackendDir

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting College Services Backend (Local Development)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check if application-local.properties exists
$localProps = Join-Path $BackendDir "src\main\resources\application-local.properties"
if (Test-Path $localProps) {
    Write-Host "[OK] Local configuration file detected: application-local.properties" -ForegroundColor Green
} else {
    Write-Host "[INFO] No application-local.properties found." -ForegroundColor Yellow
    Write-Host "       To enable local SMTP email delivery, copy application-local.properties.example" -ForegroundColor Yellow
    Write-Host "       to application-local.properties and add your Google App Password." -ForegroundColor Yellow
}

# 2. Check for existing process on port 8080 and cleanly stop if it's our project
$conns = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        if ($p -gt 0) {
            try {
                $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -like "*java*") {
                    Write-Host "[STOP] Stopping existing Java process (PID: $p) on port 8080..." -ForegroundColor Yellow
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                }
            } catch {
                # Ignore process query errors
            }
        }
    }
}

# 3. Launch Spring Boot
Write-Host "[START] Launching Spring Boot via Maven wrapper..." -ForegroundColor Green
.\mvnw.cmd spring-boot:run

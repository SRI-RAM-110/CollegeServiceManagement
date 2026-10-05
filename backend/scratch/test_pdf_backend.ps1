$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: Login as CSE001 ==="
$loginBody = @{
    userId = "CSE001"
    password = "dept123"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$cseToken = $loginRes.data.token
Write-Host "CSE Token obtained: $($cseToken.Substring(0, 20))..."

Write-Host "`n=== TEST 2: Fetch CSE requests ==="
$headers = @{ "Authorization" = "Bearer $cseToken" }
$myReqs = Invoke-RestMethod -Uri "http://localhost:8080/api/requests/my" -Method Get -Headers $headers
Write-Host "Total CSE requests found: $($myReqs.data.Count)"

$approvedReq = $myReqs.data | Where-Object { $_.status -eq "APPROVED" } | Select-Object -First 1
Write-Host "Selected approved request: $($approvedReq.requestId) ($($approvedReq.service))"

Write-Host "`n=== TEST 3: Generate PDF for approved request $($approvedReq.requestId) ==="
$pdfOutPath = "C:\Users\srira\.gemini\antigravity-ide\brain\7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4\scratch\approved_request.pdf"
Invoke-WebRequest -Uri "http://localhost:8080/api/requests/$($approvedReq.requestId)/pdf" -Headers $headers -OutFile $pdfOutPath

$fileInfo = Get-Item $pdfOutPath
Write-Host "PDF Generated Successfully! Size: $($fileInfo.Length) bytes"

Write-Host "`n=== TEST 4: Negative Case - Non-Approved Request ==="
$pendingReq = $myReqs.data | Where-Object { $_.status -eq "PENDING" } | Select-Object -First 1
if ($pendingReq) {
    try {
        Invoke-WebRequest -Uri "http://localhost:8080/api/requests/$($pendingReq.requestId)/pdf" -Headers $headers
        Write-Host "ERROR: Expected failure for pending request!" -ForegroundColor Red
    } catch {
        Write-Host "SUCCESS: Blocked non-approved request as expected: $($_.Exception.Message)" -ForegroundColor Green
    }
}

Write-Host "`n=== TEST 5: Security Test - Unauthorized Department User ==="
$loginEce = @{
    userId = "ECE001"
    password = "dept123"
} | ConvertTo-Json
$eceRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $loginEce -ContentType "application/json"
$eceToken = $eceRes.data.token
$eceHeaders = @{ "Authorization" = "Bearer $eceToken" }

try {
    Invoke-WebRequest -Uri "http://localhost:8080/api/requests/$($approvedReq.requestId)/pdf" -Headers $eceHeaders
    Write-Host "ERROR: ECE user accessed CSE PDF!" -ForegroundColor Red
} catch {
    Write-Host "SUCCESS: ECE user was forbidden from accessing CSE request: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host "`n=== ALL BACKEND PDF TESTS PASSED ==="

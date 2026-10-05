$ErrorActionPreference = "Stop"

# 1. Login as AO Super Admin
$adminBody = @{ userId = "AO001"; password = "admin123" } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
$adminToken = $adminRes.data.token
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

# Fetch all requests across all services
$allReqs = Invoke-RestMethod -Uri "http://localhost:8080/api/requests/all" -Method Get -Headers $adminHeaders
Write-Host "Total college requests: $($allReqs.data.Count)"

$services = @("SEMINAR", "ACCOMMODATION", "TRANSPORT", "STATIONERY", "MEALS")

foreach ($svc in $services) {
    Write-Host "`n--- Testing Service: $svc ---"
    $req = $allReqs.data | Where-Object { $_.serviceCategory -eq $svc -and ($_.status -eq "APPROVED" -or $_.status -eq "BOOKED") } | Select-Object -First 1
    
    if (-not $req) {
        Write-Host "No approved request found for $svc, searching pending to approve..."
        $pending = $allReqs.data | Where-Object { $_.serviceCategory -eq $svc } | Select-Object -First 1
        if ($pending) {
            Write-Host "Found request $($pending.requestId), approving..."
            # Approve depending on service
            if ($svc -eq "SEMINAR") {
                Invoke-RestMethod -Uri "http://localhost:8080/api/seminar/requests/$($pending.id)/approve" -Method Put -Headers $adminHeaders
            } elseif ($svc -eq "ACCOMMODATION") {
                Invoke-RestMethod -Uri "http://localhost:8080/api/accommodation/requests/$($pending.id)/approve" -Method Put -Headers $adminHeaders
            } elseif ($svc -eq "TRANSPORT") {
                Invoke-RestMethod -Uri "http://localhost:8080/api/transport/requests/$($pending.id)/approve" -Method Put -Headers $adminHeaders
            } elseif ($svc -eq "STATIONERY") {
                $body = @{ comments = "Approved for academic use" } | ConvertTo-Json
                Invoke-RestMethod -Uri "http://localhost:8080/api/stationery/requests/$($pending.id)/approve" -Method Put -Headers $adminHeaders -Body $body -ContentType "application/json"
            } elseif ($svc -eq "MEALS") {
                Invoke-RestMethod -Uri "http://localhost:8080/api/meals/requests/$($pending.id)/approve" -Method Put -Headers $adminHeaders
            }
            $req = $pending
        }
    }
    
    if ($req) {
        $pdfPath = "C:\Users\srira\.gemini\antigravity-ide\brain\7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4\scratch\$($svc)_test.pdf"
        $res = Invoke-WebRequest -Uri "http://localhost:8080/api/requests/$($req.id)/pdf" -Headers $adminHeaders -OutFile $pdfPath
        $fi = Get-Item $pdfPath
        Write-Host "Generated PDF for $($svc) (ID: $($req.requestId)) - Size: $($fi.Length) bytes"
    } else {
        Write-Host "Warning: No request found at all for $svc"
    }
}

Write-Host "`n=== ALL 5 SERVICES TEST COMPLETED ==="

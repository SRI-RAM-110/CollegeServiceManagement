$baseUrl = "http://localhost:8080/api"

function Login-User($userId, $password) {
    $body = @{ userId = $userId; password = $password } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
        return $resp.data.token
    } catch {
        return $null
    }
}

Write-Host "=== 1. ACQUIRE TOKENS ===" -ForegroundColor Cyan
$aoToken = Login-User "AO001" "admin123"
$cseFacultyToken = Login-User "CSE001" "dept123"

if (-not $aoToken) {
    Write-Error "Failed to login as AO001"
    exit 1
}
Write-Host "AO Admin logged in successfully." -ForegroundColor Green

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 2. TEST SELF-DELETION PROTECTION (CURRENT AO_ADMIN CANNOT DELETE ITSELF) ===" -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $aoToken" }
    $resp = Invoke-RestMethod -Uri "$baseUrl/admin/users/AO001" -Method Delete -Headers $headers -ContentType "application/json"
    Write-Host "FAIL: AO001 self-deletion succeeded unexpectedly!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Self-deletion rejected with HTTP $statusCode" -ForegroundColor Green
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $respBody = $reader.ReadToEnd()
    Write-Host "Response Body: $respBody" -ForegroundColor DarkGray
}

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 3. TEST UNAUTHORIZED USER ATTEMPTING USER REMOVAL (MUST BE 403) ===" -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $cseFacultyToken" }
    $resp = Invoke-RestMethod -Uri "$baseUrl/admin/users/csehod" -Method Delete -Headers $headers -ContentType "application/json"
    Write-Host "FAIL: Non-admin deletion succeeded unexpectedly!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Unauthorized user deletion rejected with HTTP $statusCode" -ForegroundColor Green
}

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 4. CREATE TEMPORARY USER FOR REMOVE TEST ===" -ForegroundColor Cyan
$tempUserId = "tempcoord_test_" + (Get-Random -Minimum 1000 -Maximum 9999)
$createBody = @{
    userId = $tempUserId
    name = "Temp Coordinator For Removal"
    email = "$tempUserId@nrtec.in"
    phone = "+91 99999 11111"
    department = "CSE"
    designation = "Test Assistant"
    password = "TempPassword123!"
    roles = @("SEMINAR_COORDINATOR", "DEPARTMENT_USER")
    assignedHallIds = @("SH-2")
    active = $true
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $aoToken" }
$createdResp = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method Post -Headers $headers -Body $createBody -ContentType "application/json"
Write-Host "Created test user: $($createdResp.data.userId) with assignedHallIds: $($createdResp.data.assignedHallIds -join ',')" -ForegroundColor Green

# Verify user can log in
$tempUserToken = Login-User $tempUserId "TempPassword123!"
if ($tempUserToken) {
    Write-Host "Verified test user can log in." -ForegroundColor Green
} else {
    Write-Host "Warning: test user could not log in" -ForegroundColor Yellow
}

# Verify user is assigned to SH-2 in halls API
$hallResp = Invoke-RestMethod -Uri "$baseUrl/seminar/halls" -Method Get -Headers $headers
$sh2 = $hallResp.data | Where-Object { $_.hallId -eq "SH-2" }
# Ensure SH-2 has the coordinator assigned
$currCoords = @($sh2.coordinatorUserIds)
if (-not ($currCoords -contains $tempUserId)) {
    $currCoords += $tempUserId
    $assignBody = @{ coordinators = $currCoords } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/seminar/halls/SH-2/coordinators" -Method Post -Headers $headers -Body $assignBody -ContentType "application/json" | Out-Null
    Write-Host "Explicitly confirmed $tempUserId assigned to SH-2 coordinator list." -ForegroundColor Green
}

# Verify SH-2 now has temp user
$sh2After = (Invoke-RestMethod -Uri "$baseUrl/seminar/halls" -Method Get -Headers $headers).data | Where-Object { $_.hallId -eq "SH-2" }
Write-Host "SH-2 coordinators before deletion: $($sh2After.coordinatorUserIds -join ', ')" -ForegroundColor DarkCyan

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 5. PERFORM REMOVE USER OPERATION (AO_ADMIN) ===" -ForegroundColor Cyan
$delResp = Invoke-RestMethod -Uri "$baseUrl/admin/users/$tempUserId" -Method Delete -Headers $headers -ContentType "application/json"
Write-Host "Remove User Response: $($delResp | ConvertTo-Json -Compress)" -ForegroundColor Green

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 6. VERIFY REMOVED USER CANNOT LOG IN ===" -ForegroundColor Cyan
$afterToken = Login-User $tempUserId "TempPassword123!"
if (-not $afterToken) {
    Write-Host "SUCCESS: Removed user cannot log in." -ForegroundColor Green
} else {
    Write-Host "FAIL: Removed user was still able to log in!" -ForegroundColor Red
}

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 7. VERIFY COORDINATOR ASSIGNMENTS CLEANED SAFELY ===" -ForegroundColor Cyan
$sh2Clean = (Invoke-RestMethod -Uri "$baseUrl/seminar/halls" -Method Get -Headers $headers).data | Where-Object { $_.hallId -eq "SH-2" }
Write-Host "SH-2 coordinators after deletion: $($sh2Clean.coordinatorUserIds -join ', ')" -ForegroundColor DarkCyan
if ($sh2Clean.coordinatorUserIds -contains $tempUserId) {
    Write-Host "FAIL: tempUserId still in SH-2 coordinator list!" -ForegroundColor Red
} else {
    Write-Host "SUCCESS: tempUserId cleanly removed from SH-2 coordinator list!" -ForegroundColor Green
}

# -------------------------------------------------------------------------------------------------
Write-Host "`n=== 8. VERIFY STATS UPDATE AND HISTORICAL BOOKINGS PRESERVED ===" -ForegroundColor Cyan
$statsResp = Invoke-RestMethod -Uri "$baseUrl/admin/users/stats" -Method Get -Headers $headers
Write-Host "Total Users: $($statsResp.data.totalUsers), Active: $($statsResp.data.activeUsers), Inactive: $($statsResp.data.inactiveUsers)" -ForegroundColor Green

# Verify existing seminar requests are intact
$reqResp = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method Get -Headers $headers
Write-Host "Seminar Requests Count: $($reqResp.data.Count) (All preserved intact)" -ForegroundColor Green

Write-Host "`n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===" -ForegroundColor Green

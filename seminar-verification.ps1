$ErrorActionPreference = "Continue"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " SEMINAR MODULE: 52 AUTOMATED VERIFICATION TESTS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080/api"

$global:totalTests = 52
$global:passedTests = 0
$global:failedTests = 0

function Report-Test($num, $title, $passed, $info) {
    if ($passed) {
        $global:passedTests++
        Write-Host "PASS [Test $num]: $title" -ForegroundColor Green
        if ($info) { Write-Host "      Details: $info" -ForegroundColor DarkGreen }
    } else {
        $global:failedTests++
        Write-Host "FAIL [Test $num]: $title" -ForegroundColor Red
        if ($info) { Write-Host "      Error/Info: $info" -ForegroundColor DarkRed }
    }
}

# 1. Login helper
function Login($userId, $password) {
    try {
        $body = @{ userId = $userId; password = $password } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json"
        return $res.data.token
    } catch {
        Write-Host "Error logging in as $userId`: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Acquire tokens
$cseToken   = Login "CSE001" "dept123"
$eceToken   = Login "ECE001" "dept123"
$adminToken = Login "AO001"  "admin123"
$c1Token    = Login "seminarcoordinator1" "coord123"
$c2Token    = Login "seminarcoordinator2" "coord123"
$c3Token    = Login "seminarcoordinator3" "coord123"
$c4Token    = Login "seminarcoordinator4" "coord123"
$c5Token    = Login "seminarcoordinator5" "coord123"

$cseHeaders   = @{ Authorization = "Bearer $cseToken";   "Content-Type" = "application/json" }
$eceHeaders   = @{ Authorization = "Bearer $eceToken";   "Content-Type" = "application/json" }
$adminHeaders = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }
$c1Headers    = @{ Authorization = "Bearer $c1Token";    "Content-Type" = "application/json" }
$c2Headers    = @{ Authorization = "Bearer $c2Token";    "Content-Type" = "application/json" }
$c3Headers    = @{ Authorization = "Bearer $c3Token";    "Content-Type" = "application/json" }
$c4Headers    = @{ Authorization = "Bearer $c4Token";    "Content-Type" = "application/json" }
$c5Headers    = @{ Authorization = "Bearer $c5Token";    "Content-Type" = "application/json" }

Write-Host "All tokens acquired." -ForegroundColor Gray

# Unique future dates using random offset to guarantee completely fresh slots per test run
$randOffset = Get-Random -Minimum 200 -Maximum 20000
$base = (Get-Date).AddDays($randOffset)
$d1 = $base.ToString("yyyy-MM-dd")
$d2 = $base.AddDays(1).ToString("yyyy-MM-dd")
$d3 = $base.AddDays(2).ToString("yyyy-MM-dd")
$d4 = $base.AddDays(3).ToString("yyyy-MM-dd")
$d5 = $base.AddDays(4).ToString("yyyy-MM-dd")
$d6 = $base.AddDays(5).ToString("yyyy-MM-dd")
$d7 = $base.AddDays(6).ToString("yyyy-MM-dd")
$d8 = $base.AddDays(7).ToString("yyyy-MM-dd")
$d9 = $base.AddDays(8).ToString("yyyy-MM-dd")
$d10 = $base.AddDays(9).ToString("yyyy-MM-dd")
$d11 = $base.AddDays(10).ToString("yyyy-MM-dd")
$d12 = $base.AddDays(11).ToString("yyyy-MM-dd")
$d13 = $base.AddDays(12).ToString("yyyy-MM-dd")
$d14 = $base.AddDays(13).ToString("yyyy-MM-dd")
$d15 = $base.AddDays(14).ToString("yyyy-MM-dd")
$d16 = $base.AddDays(15).ToString("yyyy-MM-dd")
$d17 = $base.AddDays(16).ToString("yyyy-MM-dd")
$d18 = $base.AddDays(17).ToString("yyyy-MM-dd")
$d19 = $base.AddDays(18).ToString("yyyy-MM-dd")
$d20 = $base.AddDays(19).ToString("yyyy-MM-dd")

# =========================================================================
# SECTION 45: TESTS 1-8: Submission & Conflict
# =========================================================================

# Test 1: Single day booking submission (PENDING, no immediate BOOKED)
try {
    $t1Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d1; slot = "FORENOON"
        eventTitle = "National Conference on AI"; purpose = "Keynote presentation"
        expectedParticipants = 100
    } | ConvertTo-Json
    $t1Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t1Body -Headers $cseHeaders
    $passed = ($t1Res.success -and $t1Res.data.status -eq "PENDING" -and $t1Res.data.bookingId)
    $b1Id = $t1Res.data.bookingId
    Report-Test 1 "Single day booking submission (PENDING)" $passed "Created $b1Id with status $($t1Res.data.status)"
} catch {
    Report-Test 1 "Single day booking submission (PENDING)" $false $_.Exception.Message
}

# Test 2: Double-booking same slot blocked (409 Conflict)
try {
    $t2Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d1; slot = "FORENOON"
        eventTitle = "Conflicting AI Workshop"; purpose = "Workshop session"
        expectedParticipants = 80
    } | ConvertTo-Json
    $t2Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t2Body -Headers $eceHeaders
    Report-Test 2 "Double-booking same slot blocked (409 Conflict)" $false "Expected conflict but succeeded"
} catch {
    $is409 = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 2 "Double-booking same slot blocked (409 Conflict)" $is409 $_.Exception.Message
}

# Test 3: Same day, different slot allowed (200/201, both exist)
try {
    $t3Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d1; slot = "AFTERNOON"
        eventTitle = "Afternoon Hands-on Lab"; purpose = "Student lab"
        expectedParticipants = 80
    } | ConvertTo-Json
    $t3Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t3Body -Headers $cseHeaders
    $passed = ($t3Res.success -and $t3Res.data.status -eq "PENDING")
    Report-Test 3 "Same day, different slot allowed" $passed "Afternoon slot created: $($t3Res.data.bookingId)"
} catch {
    Report-Test 3 "Same day, different slot allowed" $false $_.Exception.Message
}

# Test 4: FULL_DAY blocks FORENOON (409 Conflict)
try {
    # First book FULL_DAY on d2
    $t4aBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d2; slot = "FULL_DAY"
        eventTitle = "Full Day Symposium"; purpose = "Symposium"
        expectedParticipants = 150
    } | ConvertTo-Json
    $t4aRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t4aBody -Headers $cseHeaders

    # Now attempt FORENOON on d2 -> should be blocked
    $t4bBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d2; slot = "FORENOON"
        eventTitle = "Blocked Forenoon Session"; purpose = "Blocked"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t4bRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t4bBody -Headers $eceHeaders
    Report-Test 4 "FULL_DAY blocks FORENOON (409 Conflict)" $false "Expected conflict but succeeded"
} catch {
    $isConflict = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 4 "FULL_DAY blocks FORENOON (409 Conflict)" $isConflict $_.Exception.Message
}

# Test 5: FORENOON blocks FULL_DAY (409 Conflict)
try {
    # First book FORENOON on d3
    $t5aBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d3; slot = "FORENOON"
        eventTitle = "Morning Guest Lecture"; purpose = "Lecture"
        expectedParticipants = 90
    } | ConvertTo-Json
    $t5aRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t5aBody -Headers $cseHeaders

    # Now attempt FULL_DAY on d3 -> should be blocked
    $t5bBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d3; slot = "FULL_DAY"
        eventTitle = "Attempted Full Day"; purpose = "Should fail"
        expectedParticipants = 120
    } | ConvertTo-Json
    $t5bRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t5bBody -Headers $eceHeaders
    Report-Test 5 "FORENOON blocks FULL_DAY (409 Conflict)" $false "Expected conflict but succeeded"
} catch {
    $isConflict = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 5 "FORENOON blocks FULL_DAY (409 Conflict)" $isConflict $_.Exception.Message
}

# Test 6: Multi-day contiguous booking (all dates PENDING)
try {
    $t6Body = @{
        bookingType = "MULTI_DAY"; hallId = "SH-3"
        startDate = $d4; endDate = $d6; slot = "FORENOON"
        eventTitle = "3-Day Faculty Development Program"; purpose = "Faculty training"
        expectedParticipants = 70
    } | ConvertTo-Json
    $t6Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t6Body -Headers $cseHeaders
    $seriesId6 = $t6Res.data.seriesId
    # Verify occurrences
    $occRes = Invoke-RestMethod -Uri "$baseUrl/seminar/series/$seriesId6" -Method GET -Headers $cseHeaders
    $allPending = ($occRes.data.Count -eq 3) -and (($occRes.data | Where-Object { $_.status -eq "PENDING" }).Count -eq 3)
    Report-Test 6 "Multi-day contiguous booking (all dates PENDING)" $allPending "Created 3 occurrences under series $seriesId6"
} catch {
    Report-Test 6 "Multi-day contiguous booking (all dates PENDING)" $false $_.Exception.Message
}

# Test 7: Multi-day overlap detection (conflict on overlapping date)
try {
    # Attempt single booking on d5 (within d4-d6 multi-day window) on SH-3
    $t7Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-3"; date = $d5; slot = "FORENOON"
        eventTitle = "Overlapping Mid-Workshop"; purpose = "Conflict test"
        expectedParticipants = 40
    } | ConvertTo-Json
    $t7Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t7Body -Headers $eceHeaders
    Report-Test 7 "Multi-day overlap detection" $false "Expected overlap conflict but booking succeeded"
} catch {
    $isConflict = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 7 "Multi-day overlap detection" $isConflict $_.Exception.Message
}

# Test 8: Recurring booking generation (all occurrences created with correct dates/slot)
try {
    # Find next Monday and Wednesday
    $rStart = $base.AddDays(25)
    $rEnd = $rStart.AddDays(14)
    $t8Body = @{
        bookingType = "RECURRING"; hallId = "SH-4"
        startDate = $rStart.ToString("yyyy-MM-dd")
        endDate = $rEnd.ToString("yyyy-MM-dd")
        slot = "AFTERNOON"
        recurrenceDays = @("MONDAY", "WEDNESDAY")
        eventTitle = "Bi-weekly Research Colloquium"
        purpose = "Colloquium series"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t8Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t8Body -Headers $cseHeaders
    $seriesId8 = $t8Res.data.seriesId
    $occRes8 = Invoke-RestMethod -Uri "$baseUrl/seminar/series/$seriesId8" -Method GET -Headers $cseHeaders
    $passed = ($t8Res.success -and $occRes8.data.Count -gt 0 -and $t8Res.data.isRecurring -eq $true)
    Report-Test 8 "Recurring booking generation" $passed "Generated $($occRes8.data.Count) occurrences for series $seriesId8"
} catch {
    Report-Test 8 "Recurring booking generation" $false $_.Exception.Message
}

# =========================================================================
# SECTION 46: TESTS 9-16: Rejection & Edge Cases
# =========================================================================

# Test 9: Recurring conflict skip/report (conflicting dates reported)
try {
    # Pre-book single date in recurring range on SH-4
    $preDate = $rStart.ToString("yyyy-MM-dd")
    # If we attempt another recurring booking over the same dates and slot on SH-4 -> should report conflict
    $t9Body = @{
        bookingType = "RECURRING"; hallId = "SH-4"
        startDate = $rStart.ToString("yyyy-MM-dd")
        endDate = $rEnd.ToString("yyyy-MM-dd")
        slot = "AFTERNOON"
        recurrenceDays = @("MONDAY")
        eventTitle = "Conflicting Recurring"
        purpose = "Conflict test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t9Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t9Body -Headers $eceHeaders
    Report-Test 9 "Recurring conflict detection and report" $false "Expected conflict report but succeeded"
} catch {
    $isConflict = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 9 "Recurring conflict detection and report" $isConflict "Correctly reported conflict: $($_.Exception.Message)"
}

# Test 10: Recurring max occurrences cap (reject if > limit, e.g. 52)
try {
    $t10Body = @{
        bookingType = "RECURRING"; hallId = "SH-1"
        startDate = $base.ToString("yyyy-MM-dd")
        endDate = $base.AddDays(400).ToString("yyyy-MM-dd")
        slot = "FORENOON"
        recurrenceDays = @("MONDAY", "WEDNESDAY") # > 100 occurrences
        eventTitle = "Over Limit Recurring"
        purpose = "Testing cap"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t10Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t10Body -Headers $cseHeaders
    Report-Test 10 "Recurring max occurrences cap" $false "Expected cap error but booking succeeded"
} catch {
    $isCapError = $_.Exception.Message -match "52" -or $_.Exception.Message -match "maximum" -or $_.Exception.Message -match "400"
    Report-Test 10 "Recurring max occurrences cap" $isCapError $_.Exception.Message
}

# Test 11: Past date rejection (cannot book in the past, 400 Bad Request)
try {
    $t11Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = "2020-01-15"; slot = "FORENOON"
        eventTitle = "Past Event"; purpose = "Past"
        expectedParticipants = 30
    } | ConvertTo-Json
    $t11Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t11Body -Headers $cseHeaders
    Report-Test 11 "Past date rejection (400 Bad Request)" $false "Expected past date error but booking succeeded"
} catch {
    $isPastError = $_.Exception.Message -match "past" -or $_.Exception.Message -match "400"
    Report-Test 11 "Past date rejection (400 Bad Request)" $isPastError $_.Exception.Message
}

# Test 12: Maintenance mode blocking (hall under maintenance rejects booking)
try {
    # Set SH-2 to MAINTENANCE
    $maintBody = @{ status = "MAINTENANCE" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/halls/SH-2/status" -Method PUT -Body $maintBody -Headers $adminHeaders
    
    # Try to book SH-2
    $t12Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-2"; date = $d7; slot = "FORENOON"
        eventTitle = "Booking During Maintenance"; purpose = "Testing maintenance"
        expectedParticipants = 50
    } | ConvertTo-Json
    
    $blocked = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t12Body -Headers $cseHeaders
    } catch {
        $blocked = $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "MAINTENANCE" -or $_.Exception.Message -match "400" -or $_.Exception.Message -match "409"
    }

    # Restore SH-2 to Available
    $availBody = @{ status = "Available" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/halls/SH-2/status" -Method PUT -Body $availBody -Headers $adminHeaders
    Report-Test 12 "Maintenance mode blocking" $blocked "Blocked booking while hall was under MAINTENANCE, restored to Available"
} catch {
    Report-Test 12 "Maintenance mode blocking" $false $_.Exception.Message
}

# Test 13: Invalid slot rejection (slot not in enum/valid list, 400)
try {
    $t13Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d8; slot = "MIDNIGHT_SESSION"
        eventTitle = "Invalid Slot Event"; purpose = "Test invalid slot"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t13Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t13Body -Headers $cseHeaders
    Report-Test 13 "Invalid slot rejection (400)" $false "Expected slot error but succeeded"
} catch {
    $isSlotError = $_.Exception.Message -match "Invalid slot" -or $_.Exception.Message -match "400"
    Report-Test 13 "Invalid slot rejection (400)" $isSlotError $_.Exception.Message
}

# Test 14: Nonexistent hall rejection (hall ID not found, 404)
try {
    $t14Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-999-NONEXISTENT"; date = $d8; slot = "FORENOON"
        eventTitle = "Ghost Hall Event"; purpose = "Ghost"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t14Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t14Body -Headers $cseHeaders
    Report-Test 14 "Nonexistent hall rejection (404)" $false "Expected 404 but succeeded"
} catch {
    $is404 = $_.Exception.Message -match "404" -or $_.Exception.Message -match "not found"
    Report-Test 14 "Nonexistent hall rejection (404)" $is404 $_.Exception.Message
}

# Test 15: Department auto-population (booking reflects user's department)
try {
    $t15Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d8; slot = "FORENOON"
        eventTitle = "CSE Department Auto Population Check"; purpose = "Dept check"
        expectedParticipants = 45
    } | ConvertTo-Json
    $t15Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t15Body -Headers $cseHeaders
    $passed = ($t15Res.data.department -eq "CSE")
    $t15Id = $t15Res.data.bookingId
    Report-Test 15 "Department auto-population" $passed "Department auto-populated as '$($t15Res.data.department)'"
} catch {
    Report-Test 15 "Department auto-population" $false $_.Exception.Message
}

# Test 16: Empty event title rejection (validation error, 400)
try {
    $t16Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d9; slot = "FORENOON"
        eventTitle = "   "; purpose = "No title test"
        expectedParticipants = 45
    } | ConvertTo-Json
    $t16Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t16Body -Headers $cseHeaders
    Report-Test 16 "Empty event title rejection (400)" $false "Expected validation error for empty title but succeeded"
} catch {
    $isTitleError = $_.Exception.Message -match "title" -or $_.Exception.Message -match "400"
    Report-Test 16 "Empty event title rejection (400)" $isTitleError $_.Exception.Message
}

# =========================================================================
# SECTION 47: TESTS 17-22: Approval Lifecycle
# =========================================================================

# Test 17: Coordinator approve booking (PENDING -> APPROVED / BOOKED)
try {
    # Approve t15Id (on SH-1) using seminarcoordinator1 (assigned to SH-1)
    $t17Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t15Id/approve" -Method PUT -Headers $c1Headers
    $passed = ($t17Res.success -and ($t17Res.data.status -eq "APPROVED" -or $t17Res.data.status -eq "BOOKED"))
    Report-Test 17 "Coordinator approve booking (PENDING -> APPROVED)" $passed "Status is now $($t17Res.data.status)"
} catch {
    Report-Test 17 "Coordinator approve booking (PENDING -> APPROVED)" $false $_.Exception.Message
}

# Test 18: Coordinator reject booking with reason (PENDING -> REJECTED, reason stored)
try {
    # Create a fresh booking on SH-1
    $t18CreateBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d9; slot = "FORENOON"
        eventTitle = "Booking to be rejected"; purpose = "Rejection lifecycle test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t18CreateRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t18CreateBody -Headers $cseHeaders
    $t18Id = $t18CreateRes.data.bookingId

    # Reject with reason
    $t18RejBody = @{ reason = "Conflict with institutional accreditation visit" } | ConvertTo-Json
    $t18RejRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t18Id/reject" -Method PUT -Body $t18RejBody -Headers $c1Headers
    $passed = ($t18RejRes.data.status -eq "REJECTED" -and $t18RejRes.data.rejectionReason -eq "Conflict with institutional accreditation visit")
    Report-Test 18 "Coordinator reject booking with reason stored" $passed "Status: $($t18RejRes.data.status), Reason: $($t18RejRes.data.rejectionReason)"
} catch {
    Report-Test 18 "Coordinator reject booking with reason stored" $false $_.Exception.Message
}

# Test 19: Double approval rejected (cannot approve already approved booking, 400/409)
try {
    $t19Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t15Id/approve" -Method PUT -Headers $c1Headers
    Report-Test 19 "Double approval rejected" $false "Expected error on double approval but succeeded"
} catch {
    $isErr = $_.Exception.Message -match "Cannot approve" -or $_.Exception.Message -match "400" -or $_.Exception.Message -match "409"
    Report-Test 19 "Double approval rejected" $isErr $_.Exception.Message
}

# Test 20: Reject already approved booking (not allowed via reject endpoint, use cancellation)
try {
    $t20Body = @{ reason = "Attempting illegal reject" } | ConvertTo-Json
    $t20Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t15Id/reject" -Method PUT -Body $t20Body -Headers $c1Headers
    Report-Test 20 "Reject already approved booking blocked" $false "Expected error when rejecting approved booking but succeeded"
} catch {
    $isErr = $_.Exception.Message -match "Cannot reject" -or $_.Exception.Message -match "cancellation" -or $_.Exception.Message -match "400"
    Report-Test 20 "Reject already approved booking blocked" $isErr $_.Exception.Message
}

# Test 21: Approve already rejected booking (cannot approve rejected booking)
try {
    $t21Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t18Id/approve" -Method PUT -Headers $c1Headers
    Report-Test 21 "Approve already rejected booking blocked" $false "Expected error when approving rejected booking but succeeded"
} catch {
    $isErr = $_.Exception.Message -match "Cannot approve" -or $_.Exception.Message -match "400"
    Report-Test 21 "Approve already rejected booking blocked" $isErr $_.Exception.Message
}

# Test 22: Slot freed on rejection (new booking for same slot succeeds)
try {
    # The slot on SH-1, d9, FORENOON was rejected in Test 18. Now book it again.
    $t22Body = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d9; slot = "FORENOON"
        eventTitle = "Successor Booking in Freed Slot"; purpose = "Verify slot freed"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t22Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t22Body -Headers $cseHeaders
    $passed = ($t22Res.success -and $t22Res.data.status -eq "PENDING")
    Report-Test 22 "Slot freed on rejection allows new booking" $passed "Created $($t22Res.data.bookingId) in freed slot"
} catch {
    Report-Test 22 "Slot freed on rejection allows new booking" $false $_.Exception.Message
}

# =========================================================================
# SECTION 48: TESTS 23-28: Cancellation & Concurrency
# =========================================================================

# Test 23: Approval conflict check (Request A & B submitted for same slot. A approved -> B approval fails with 409)
try {
    # Request A submitted normally on SH-1, d10, FORENOON
    $t23aBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d10; slot = "FORENOON"
        eventTitle = "Contender A Event"; purpose = "Concurrency contender A"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t23aRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t23aBody -Headers $cseHeaders
    $reqAId = $t23aRes.data.bookingId

    # Request B created via test fixture on same hall, date, slot
    $t23bBody = @{
        hallId = "SH-1"; date = $d10; slot = "FORENOON"
        eventTitle = "Contender B Pending Fixture"; department = "ECE"
    } | ConvertTo-Json
    $t23bRes = Invoke-RestMethod -Uri "$baseUrl/seminar/test-fixture/create-pending" -Method POST -Body $t23bBody -Headers $adminHeaders
    $reqBId = $t23bRes.data.bookingId

    # Approve Contender A -> succeeds
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$reqAId/approve" -Method PUT -Headers $c1Headers

    # Attempt to approve Contender B -> must fail with 409 Conflict due to fresh slot recheck
    $bFailed = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$reqBId/approve" -Method PUT -Headers $c1Headers
    } catch {
        $bFailed = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    }
    Report-Test 23 "Approval conflict check with fresh recheck" $bFailed "Request A approved; Request B approval correctly failed with 409 Conflict"
} catch {
    Report-Test 23 "Approval conflict check with fresh recheck" $false $_.Exception.Message
}

# Test 24: Department cancel PENDING booking (immediate CANCELLED, slot freed)
try {
    # Create PENDING booking on SH-1, d11, FORENOON
    $t24Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d11; slot = "FORENOON"
        eventTitle = "Pending Booking to Cancel"; purpose = "Immediate cancellation test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t24Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t24Create -Headers $cseHeaders
    $t24Id = $t24Res.data.bookingId

    # Cancel as department
    $t24CancelBody = @{ reason = "Faculty unavailable"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $t24CancelRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t24Id/cancel" -Method PUT -Body $t24CancelBody -Headers $cseHeaders
    $isCancelled = ($t24CancelRes.data.status -eq "CANCELLED")

    # Verify slot freed by booking again
    $t24Rebook = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t24Create -Headers $eceHeaders
    $slotFreed = ($t24Rebook.success -and $t24Rebook.data.status -eq "PENDING")

    Report-Test 24 "Department cancel PENDING booking (immediate CANCELLED, slot freed)" ($isCancelled -and $slotFreed) "Status: $($t24CancelRes.data.status), slot re-booked successfully"
} catch {
    Report-Test 24 "Department cancel PENDING booking (immediate CANCELLED, slot freed)" $false $_.Exception.Message
}

# Test 25: Department cancel APPROVED booking (transitions to CANCELLATION_REQUESTED)
try {
    # Take t15Id (approved on SH-1, d8, FORENOON)
    $t25Body = @{ reason = "Chief Guest rescheduling tour"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $t25Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t15Id/cancel" -Method PUT -Body $t25Body -Headers $cseHeaders
    $passed = ($t25Res.data.status -eq "CANCELLATION_REQUESTED")
    Report-Test 25 "Department cancel APPROVED booking (CANCELLATION_REQUESTED)" $passed "Status transitioned to $($t25Res.data.status)"
} catch {
    Report-Test 25 "Department cancel APPROVED booking (CANCELLATION_REQUESTED)" $false $_.Exception.Message
}

# Test 26: Coordinator approve cancellation (CANCELLATION_REQUESTED -> CANCELLED, slot freed)
try {
    $t26Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t15Id/cancel/approve" -Method PUT -Headers $c1Headers
    $isCancelled = ($t26Res.data.status -eq "CANCELLED")

    # Verify slot is freed on SH-1, d8, FORENOON
    $t26NewBody = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d8; slot = "FORENOON"
        eventTitle = "Replacement Event in Freed Slot"; purpose = "Verify freed slot"
        expectedParticipants = 45
    } | ConvertTo-Json
    $t26NewRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t26NewBody -Headers $eceHeaders
    $passed = ($isCancelled -and $t26NewRes.success)
    Report-Test 26 "Coordinator approve cancellation (CANCELLED, slot freed)" $passed "Cancelled booking $t15Id and confirmed slot reusability"
} catch {
    Report-Test 26 "Coordinator approve cancellation (CANCELLED, slot freed)" $false $_.Exception.Message
}

# Test 27: Coordinator reject cancellation (CANCELLATION_REQUESTED -> remains APPROVED)
try {
    # Create booking on SH-1, d12, FORENOON, approve it, then department requests cancellation
    $t27Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d12; slot = "FORENOON"
        eventTitle = "Pre-allocated Annual Exam"; purpose = "Exam"
        expectedParticipants = 80
    } | ConvertTo-Json
    $t27Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t27Create -Headers $cseHeaders
    $t27Id = $t27Res.data.bookingId

    # Coordinator approves
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t27Id/approve" -Method PUT -Headers $c1Headers

    # Department requests cancellation
    $t27ReqCancel = @{ reason = "Faculty wants to cancel"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t27Id/cancel" -Method PUT -Body $t27ReqCancel -Headers $cseHeaders

    # Coordinator rejects cancellation
    $t27RejBody = @{ reason = "Exam schedule is finalized and cannot be cancelled" } | ConvertTo-Json
    $t27RejRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t27Id/cancel/reject" -Method PUT -Body $t27RejBody -Headers $c1Headers
    $passed = ($t27RejRes.data.status -eq "APPROVED" -or $t27RejRes.data.status -eq "BOOKED")
    Report-Test 27 "Coordinator reject cancellation (remains APPROVED)" $passed "Status remained $($t27RejRes.data.status)"
} catch {
    Report-Test 27 "Coordinator reject cancellation (remains APPROVED)" $false $_.Exception.Message
}

# Test 28: Recurring series cancel entire series (all future occurrences cancelled)
try {
    # Create recurring series
    $t28Body = @{
        bookingType = "RECURRING"; hallId = "SH-5"
        startDate = $base.AddDays(40).ToString("yyyy-MM-dd")
        endDate = $base.AddDays(50).ToString("yyyy-MM-dd")
        slot = "FORENOON"
        recurrenceDays = @("TUESDAY", "THURSDAY")
        eventTitle = "Series to Cancel Entirely"; purpose = "Entire series cancel test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t28Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t28Body -Headers $cseHeaders
    $s28Id = $t28Res.data.seriesId
    $first28Id = $t28Res.data.bookingId

    # Cancel with scope ENTIRE_SERIES
    $t28Cancel = @{ reason = "Series cancelled by Dean"; scope = "ENTIRE_SERIES" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$first28Id/cancel" -Method PUT -Body $t28Cancel -Headers $cseHeaders

    # Verify all occurrences under series are CANCELLED
    $occ28 = Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s28Id" -Method GET -Headers $cseHeaders
    $allCancelled = ($occ28.data.Count -gt 0) -and (($occ28.data | Where-Object { $_.status -eq "CANCELLED" }).Count -eq $occ28.data.Count)
    Report-Test 28 "Recurring series cancel entire series" $allCancelled "All $($occ28.data.Count) occurrences in series $s28Id are CANCELLED"
} catch {
    Report-Test 28 "Recurring series cancel entire series" $false $_.Exception.Message
}

# =========================================================================
# SECTION 49: TESTS 29-34: Recurring & Reschedule
# =========================================================================

# Test 29: Recurring series cancel single occurrence (only specified occurrence cancelled, others intact)
try {
    # Create recurring series
    $t29Body = @{
        bookingType = "RECURRING"; hallId = "SH-5"
        startDate = $base.AddDays(60).ToString("yyyy-MM-dd")
        endDate = $base.AddDays(70).ToString("yyyy-MM-dd")
        slot = "AFTERNOON"
        recurrenceDays = @("MONDAY", "WEDNESDAY")
        eventTitle = "Series Single Cancel Test"; purpose = "Single occ cancel test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t29Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t29Body -Headers $cseHeaders
    $s29Id = $t29Res.data.seriesId
    $occList29 = (Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s29Id" -Method GET -Headers $cseHeaders).data
    $targetOcc = $occList29[0]

    # Cancel only this occurrence
    $t29Cancel = @{ reason = "Public holiday on this day"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$($targetOcc.bookingId)/cancel" -Method PUT -Body $t29Cancel -Headers $cseHeaders

    # Verify target is CANCELLED while others remain PENDING
    $afterOcc29 = (Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s29Id" -Method GET -Headers $cseHeaders).data
    $cancelledCount = @($afterOcc29 | Where-Object { $_.status -eq "CANCELLED" }).Count
    $pendingCount = @($afterOcc29 | Where-Object { $_.status -eq "PENDING" }).Count
    $passed = ($cancelledCount -eq 1 -and $pendingCount -gt 0)
    Report-Test 29 "Recurring series cancel single occurrence" $passed "1 occurrence CANCELLED, $pendingCount occurrences intact (PENDING)"
} catch {
    Report-Test 29 "Recurring series cancel single occurrence" $false $_.Exception.Message
}

# Test 30: Department request reschedule (APPROVED -> RESCHEDULE_REQUESTED, target fields stored)
try {
    # Create a booking on SH-1, d13, FORENOON and approve it
    $t30Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d13; slot = "FORENOON"
        eventTitle = "Event to Reschedule"; purpose = "Reschedule test"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t30Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t30Create -Headers $cseHeaders
    $t30Id = $t30Res.data.bookingId
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t30Id/approve" -Method PUT -Headers $c1Headers

    # Request reschedule to SH-1, d14, FORENOON
    $t30ReqBody = @{
        targetHallId = "SH-1"; targetDate = $d14; targetSlot = "FORENOON"
        reason = "Resource speaker available only on target date"; scope = "THIS_OCCURRENCE"
    } | ConvertTo-Json
    $t30ReqRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t30Id/reschedule" -Method PUT -Body $t30ReqBody -Headers $cseHeaders
    $passed = ($t30ReqRes.data.status -eq "RESCHEDULE_REQUESTED" -and $t30ReqRes.data.rescheduledDate -eq $d14 -and $t30ReqRes.data.rescheduledHallId -eq "SH-1")
    Report-Test 30 "Department request reschedule (RESCHEDULE_REQUESTED)" $passed "Status: $($t30ReqRes.data.status), Target: $($t30ReqRes.data.rescheduledDate) ($($t30ReqRes.data.rescheduledSlot))"
} catch {
    Report-Test 30 "Department request reschedule (RESCHEDULE_REQUESTED)" $false $_.Exception.Message
}

# Test 31: Coordinator approve reschedule (original slot freed, new slot confirmed)
try {
    # Approve reschedule of t30Id
    $t31Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t30Id/reschedule/approve" -Method PUT -Headers $c1Headers
    $isApproved = ($t31Res.data.status -eq "APPROVED" -and $t31Res.data.date -eq $d14)

    # Verify original slot (SH-1, d13, FORENOON) is freed by booking it
    $t31OrigBook = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d13; slot = "FORENOON"
        eventTitle = "New Booking in Freed Original Slot"; purpose = "Verify original slot freed"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t31OrigRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t31OrigBook -Headers $eceHeaders
    $passed = ($isApproved -and $t31OrigRes.success)
    Report-Test 31 "Coordinator approve reschedule (slot freed & new slot confirmed)" $passed "Rescheduled to $d14, original slot $d13 freed and re-booked"
} catch {
    Report-Test 31 "Coordinator approve reschedule (slot freed & new slot confirmed)" $false $_.Exception.Message
}

# Test 32: Coordinator reject reschedule (original booking remains APPROVED at original slot)
try {
    # Create booking on SH-1, d15, FORENOON and approve it
    $t32Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d15; slot = "FORENOON"
        eventTitle = "Event for Rejected Reschedule"; purpose = "Reject reschedule test"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t32Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t32Create -Headers $cseHeaders
    $t32Id = $t32Res.data.bookingId
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t32Id/approve" -Method PUT -Headers $c1Headers

    # Request reschedule
    $t32ReqBody = @{
        targetHallId = "SH-1"; targetDate = $d16; targetSlot = "FORENOON"
        reason = "Date adjustment"; scope = "THIS_OCCURRENCE"
    } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t32Id/reschedule" -Method PUT -Body $t32ReqBody -Headers $cseHeaders

    # Coordinator rejects reschedule
    $t32RejBody = @{ reason = "Target slot reserved for institutional setup" } | ConvertTo-Json
    $t32RejRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t32Id/reschedule/reject" -Method PUT -Body $t32RejBody -Headers $c1Headers
    $passed = ($t32RejRes.data.status -eq "APPROVED" -and $t32RejRes.data.date -eq $d15)
    Report-Test 32 "Coordinator reject reschedule (remains APPROVED at original slot)" $passed "Original booking maintained at $d15 with status $($t32RejRes.data.status)"
} catch {
    Report-Test 32 "Coordinator reject reschedule (remains APPROVED at original slot)" $false $_.Exception.Message
}

# Test 33: Reschedule to occupied slot blocked (cannot reschedule to already booked slot)
try {
    # We already have an approved booking on d14, FORENOON (from Test 31)
    # Attempt to reschedule t32Id (on d15) to d14, FORENOON -> must be blocked
    $t33ReqBody = @{
        targetHallId = "SH-1"; targetDate = $d14; targetSlot = "FORENOON"
        reason = "Attempting occupied slot reschedule"; scope = "THIS_OCCURRENCE"
    } | ConvertTo-Json
    $t33Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t32Id/reschedule" -Method PUT -Body $t33ReqBody -Headers $cseHeaders
    Report-Test 33 "Reschedule to occupied slot blocked" $false "Expected occupied slot error but succeeded"
} catch {
    $isErr = $_.Exception.Message -match "409" -or $_.Exception.Message -match "unavailable" -or $_.Exception.Message -match "Conflict"
    Report-Test 33 "Reschedule to occupied slot blocked" $isErr $_.Exception.Message
}

# Test 34: Dual-hall authorization on reschedule (coordinator must be authorized for BOTH halls)
try {
    # Create booking on SH-1 (coordinator 1 is assigned to SH-1, but NOT SH-2)
    $t34Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d17; slot = "FORENOON"
        eventTitle = "Cross-Hall Reschedule Test"; purpose = "Dual hall auth test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t34Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t34Create -Headers $cseHeaders
    $t34Id = $t34Res.data.bookingId
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t34Id/approve" -Method PUT -Headers $c1Headers

    # Request reschedule to SH-2, d18, FORENOON
    $t34ReqBody = @{
        targetHallId = "SH-2"; targetDate = $d18; targetSlot = "FORENOON"
        reason = "Bigger audience needs SH-2"; scope = "THIS_OCCURRENCE"
    } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t34Id/reschedule" -Method PUT -Body $t34ReqBody -Headers $cseHeaders

    # seminarcoordinator1 attempts to approve reschedule -> must fail with 403 Forbidden because c1 is not authorized for SH-2!
    $c1Blocked = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t34Id/reschedule/approve" -Method PUT -Headers $c1Headers
    } catch {
        $c1Blocked = $_.Exception.Message -match "403" -or $_.Exception.Message -match "Forbidden" -or $_.Exception.Message -match "not authorized"
    }

    # But Super Admin (AO001) can approve it!
    $adminSuccess = $false
    try {
        $adminRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t34Id/reschedule/approve" -Method PUT -Headers $adminHeaders
        $adminSuccess = ($adminRes.data.status -eq "APPROVED" -and $adminRes.data.hallId -eq "SH-2")
    } catch {}

    $passed = ($c1Blocked -and $adminSuccess)
    Report-Test 34 "Dual-hall authorization on reschedule (403 for unassigned target hall)" $passed "Coordinator 1 blocked (403) for target hall SH-2; Super Admin approved successfully"
} catch {
    Report-Test 34 "Dual-hall authorization on reschedule" $false $_.Exception.Message
}

# =========================================================================
# SECTION 50: TESTS 35-40: Hall Authorization & Privacy
# =========================================================================

# Test 35: Coordinator A cannot approve Coordinator B's hall (403 Forbidden)
try {
    # Create booking on SH-1 (assigned to seminarcoordinator1)
    $t35Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d19; slot = "FORENOON"
        eventTitle = "Authorization Boundary Test"; purpose = "Auth test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t35Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t35Create -Headers $cseHeaders
    $t35Id = $t35Res.data.bookingId

    # seminarcoordinator2 (assigned only to SH-2) attempts to approve SH-1 -> 403 Forbidden
    $c2Blocked = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t35Id/approve" -Method PUT -Headers $c2Headers
    } catch {
        $c2Blocked = $_.Exception.Message -match "403" -or $_.Exception.Message -match "Forbidden" -or $_.Exception.Message -match "not authorized"
    }
    Report-Test 35 "Coordinator A cannot approve Coordinator B's hall (403 Forbidden)" $c2Blocked "Coordinator 2 correctly denied access to approve booking on SH-1"
} catch {
    Report-Test 35 "Coordinator A cannot approve Coordinator B's hall (403 Forbidden)" $false $_.Exception.Message
}

# Test 36: Super Admin (AO_ADMIN) can approve any hall (200 OK)
try {
    # Super Admin approves t35Id on SH-1
    $t36Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t35Id/approve" -Method PUT -Headers $adminHeaders
    $passed = ($t36Res.data.status -eq "APPROVED")
    Report-Test 36 "Super Admin (AO_ADMIN) can approve any hall (200 OK)" $passed "AO Admin approved $t35Id with status $($t36Res.data.status)"
} catch {
    Report-Test 36 "Super Admin (AO_ADMIN) can approve any hall (200 OK)" $false $_.Exception.Message
}

# Test 37: Coordinator request queue only shows assigned halls (filter verification)
try {
    # seminarcoordinator2 (assigned only to SH-2) requests all bookings
    $c2List = (Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method GET -Headers $c2Headers).data
    $nonSH2Count = ($c2List | Where-Object { $_.hallId -ne "SH-2" }).Count
    $passed = ($nonSH2Count -eq 0)
    Report-Test 37 "Coordinator request queue only shows assigned halls" $passed "Coordinator 2 sees $($c2List.Count) requests, 0 unassigned hall requests"
} catch {
    Report-Test 37 "Coordinator request queue only shows assigned halls" $false $_.Exception.Message
}

# Test 38: Booking detail shows hall location (location field populated in API response)
try {
    $t38Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t35Id" -Method GET -Headers $adminHeaders
    $hasLocation = ($t38Res.data.hallLocation -ne $null -and $t38Res.data.hallLocation.Length -gt 0)
    Report-Test 38 "Booking detail shows hall location" $hasLocation "Hall location returned: '$($t38Res.data.hallLocation)'"
} catch {
    Report-Test 38 "Booking detail shows hall location" $false $_.Exception.Message
}

# Test 39: Cross-department booking privacy (Department A cannot view Department B's booking)
try {
    # t35Id was created by CSE001. ECE001 attempts to view it.
    $eceBlocked = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t35Id" -Method GET -Headers $eceHeaders
    } catch {
        $eceBlocked = $_.Exception.Message -match "403" -or $_.Exception.Message -match "Forbidden" -or $_.Exception.Message -match "not authorized"
    }
    Report-Test 39 "Cross-department booking privacy (403 Forbidden)" $eceBlocked "ECE user denied access to view CSE booking details"
} catch {
    Report-Test 39 "Cross-department booking privacy (403 Forbidden)" $false $_.Exception.Message
}

# Test 40: Multi-role coordinator can access both portal views (HOD & Coordinator)
try {
    # seminarcoordinator1 has dual roles: SEMINAR_COORDINATOR + DEPARTMENT_HOD + DEPARTMENT_USER
    # 1. As Department HOD/User, can submit a booking
    $t40Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d20; slot = "AFTERNOON"
        eventTitle = "HOD Department Review"; purpose = "Dual role test"
        expectedParticipants = 40
    } | ConvertTo-Json
    $t40Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t40Create -Headers $c1Headers
    $deptAccess = ($t40Res.success -and $t40Res.data.bookingId)

    # 2. As Seminar Coordinator, can approve a booking on assigned hall SH-1
    $t40Approve = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$($t40Res.data.bookingId)/approve" -Method PUT -Headers $c1Headers
    $coordAccess = ($t40Approve.data.status -eq "APPROVED")

    $passed = ($deptAccess -and $coordAccess)
    Report-Test 40 "Multi-role coordinator dual portal access" $passed "seminarcoordinator1 submitted departmental booking AND approved it as coordinator"
} catch {
    Report-Test 40 "Multi-role coordinator dual portal access" $false $_.Exception.Message
}

# =========================================================================
# SECTION 50: TESTS 41-52: Seminar My Requests & Cancellation (Fix Verification)
# =========================================================================

# Test 41: Department user can retrieve only their own Seminar requests via /api/seminar/requests/my
try {
    $myRes = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/my" -Method GET -Headers $cseHeaders
    $myList = $myRes.data
    $nonCseCount = ($myList | Where-Object { $_.department -ne "CSE" }).Count
    $passed = ($myRes.success -eq $true) -and ($nonCseCount -eq 0)
    Report-Test 41 "Department user can retrieve only their own Seminar requests" $passed "Returned $($myList.Count) requests for CSE, 0 from other departments"
} catch {
    Report-Test 41 "Department user can retrieve only their own Seminar requests" $false $_.Exception.Message
}

# Test 42: My Requests contains the newly created request
$t42BookingId = $null
try {
    $d42 = $base.AddDays(150).ToString("yyyy-MM-dd")
    $t42Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d42; slot = "FORENOON"
        eventTitle = "TEST 42 AI Workshop"; purpose = "Verification of My Requests listing"
        expectedParticipants = 80
    } | ConvertTo-Json
    $t42Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t42Create -Headers $cseHeaders
    $t42BookingId = $t42Res.data.bookingId

    # Query My Requests
    $myRes42 = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/my" -Method GET -Headers $cseHeaders
    $found = ($myRes42.data | Where-Object { $_.bookingId -eq $t42BookingId })
    $passed = ($null -ne $found) -and ($found.eventTitle -eq "TEST 42 AI Workshop")
    Report-Test 42 "My Requests contains the newly created request" $passed "Found booking $t42BookingId in /api/seminar/requests/my"
} catch {
    Report-Test 42 "My Requests contains the newly created request" $false $_.Exception.Message
}

# Test 43: Department user can view their own request details
try {
    $t43Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t42BookingId" -Method GET -Headers $cseHeaders
    $passed = ($t43Res.success -eq $true) -and ($t43Res.data.bookingId -eq $t42BookingId) -and ($t43Res.data.department -eq "CSE")
    Report-Test 43 "Department user can view their own request details" $passed "Retrieved complete details for $t42BookingId"
} catch {
    Report-Test 43 "Department user can view their own request details" $false $_.Exception.Message
}

# Test 44: Department user can cancel their own PENDING request (PENDING -> CANCELLED)
try {
    $cancelBody = @{ reason = "Speaker unavailable, cancelling pending request"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $t44Cancel = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t42BookingId/cancel" -Method POST -Body $cancelBody -Headers $cseHeaders
    $passed = ($t44Cancel.success -eq $true) -and ($t44Cancel.data.status -eq "CANCELLED")
    Report-Test 44 "Department user can cancel their own PENDING request" $passed "Status changed from PENDING to CANCELLED for $t42BookingId"
} catch {
    Report-Test 44 "Department user can cancel their own PENDING request" $false $_.Exception.Message
}

# Test 45: Cancelled request no longer blocks the hall slot
try {
    # Attempt to book the exact same hall, date, and slot
    $t45Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-1"; date = $d42; slot = "FORENOON"
        eventTitle = "TEST 45 Replacement Workshop"; purpose = "Slot re-booking test"
        expectedParticipants = 90
    } | ConvertTo-Json
    $t45Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t45Create -Headers $cseHeaders
    $passed = ($t45Res.success -eq $true) -and ($t45Res.data.bookingId -ne $null)
    Report-Test 45 "Cancelled request no longer blocks the hall slot" $passed "Slot freed and new booking succeeded: $($t45Res.data.bookingId)"
} catch {
    Report-Test 45 "Cancelled request no longer blocks the hall slot" $false $_.Exception.Message
}

# Test 46: Department user can request cancellation of APPROVED request (APPROVED -> CANCELLATION_REQUESTED)
try {
    # 1. Create a request and approve it
    $d46 = $base.AddDays(155).ToString("yyyy-MM-dd")
    $t46Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-2"; date = $d46; slot = "AFTERNOON"
        eventTitle = "TEST 46 Robotics Expo"; purpose = "Approved cancellation test"
        expectedParticipants = 120
    } | ConvertTo-Json
    $t46Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t46Create -Headers $cseHeaders
    $t46BookingId = $t46Res.data.bookingId

    # Approve by coordinator 2 (SH-2)
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t46BookingId/approve" -Method PUT -Headers $c2Headers

    # Verify status is APPROVED
    $approvedCheck = (Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t46BookingId" -Method GET -Headers $cseHeaders).data
    if ($approvedCheck.status -ne "APPROVED") { throw "Booking was not approved" }

    # 2. Department user requests cancellation
    $cancelReqBody = @{ reason = "Event postponed due to university schedule"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $t46Cancel = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t46BookingId/cancel" -Method POST -Body $cancelReqBody -Headers $cseHeaders
    $passed = ($t46Cancel.data.status -eq "CANCELLATION_REQUESTED")

    # 3. Coordinator approves cancellation
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t46BookingId/approve-cancellation" -Method PUT -Headers $c2Headers
    $finalCheck = (Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t46BookingId" -Method GET -Headers $cseHeaders).data
    $passed = $passed -and ($finalCheck.status -eq "CANCELLED")

    Report-Test 46 "Department user can request cancellation of APPROVED request" $passed "Transitioned APPROVED -> CANCELLATION_REQUESTED -> CANCELLED"
} catch {
    Report-Test 46 "Department user can request cancellation of APPROVED request" $false $_.Exception.Message
}

# Test 47: Department user cannot cancel another department's request (403 Forbidden)
try {
    # Create an ECE request
    $d47 = $base.AddDays(160).ToString("yyyy-MM-dd")
    $t47Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-3"; date = $d47; slot = "FORENOON"
        eventTitle = "TEST 47 ECE Seminar"; purpose = "Cross-dept cancellation test"
        expectedParticipants = 60
    } | ConvertTo-Json
    $t47Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t47Create -Headers $eceHeaders
    $t47EceId = $t47Res.data.bookingId

    # CSE user attempts to cancel ECE booking
    $forbidden = $false
    try {
        $cancelBody = @{ reason = "CSE user attempting unauthorized cancellation"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t47EceId/cancel" -Method POST -Body $cancelBody -Headers $cseHeaders
    } catch {
        $forbidden = $_.Exception.Message -match "403" -or $_.Exception.Message -match "Forbidden" -or $_.Exception.Message -match "not authorized"
    }
    Report-Test 47 "Department user cannot cancel another department's request (403 Forbidden)" $forbidden "CSE user forbidden from cancelling ECE request"
} catch {
    Report-Test 47 "Department user cannot cancel another department's request (403 Forbidden)" $false $_.Exception.Message
}

# Test 48: Department user cannot view another department's request (403 Forbidden)
try {
    # CSE user attempts to view ECE booking $t47EceId
    $forbidden = $false
    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t47EceId" -Method GET -Headers $cseHeaders
    } catch {
        $forbidden = $_.Exception.Message -match "403" -or $_.Exception.Message -match "Forbidden" -or $_.Exception.Message -match "not authorized"
    }
    Report-Test 48 "Department user cannot view another department's request (403 Forbidden)" $forbidden "CSE user forbidden from viewing ECE request details"
} catch {
    Report-Test 48 "Department user cannot view another department's request (403 Forbidden)" $false $_.Exception.Message
}

# Test 49: Cancellation request preserves cancellation reason
try {
    # Create and approve a request
    $d49 = $base.AddDays(165).ToString("yyyy-MM-dd")
    $t49Create = @{
        bookingType = "ONE_TIME"; hallId = "SH-4"; date = $d49; slot = "AFTERNOON"
        eventTitle = "TEST 49 Preserved Reason"; purpose = "Reason preservation test"
        expectedParticipants = 50
    } | ConvertTo-Json
    $t49Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t49Create -Headers $cseHeaders
    $t49Id = $t49Res.data.bookingId

    # Approve by coordinator 4
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t49Id/approve" -Method PUT -Headers $c4Headers

    # Submit cancellation with specific unique reason
    $specialReason = "Cancellation test: Chief guest flight cancelled due to bad weather"
    $cancelReq = @{ reason = $specialReason; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t49Id/cancel" -Method POST -Body $cancelReq -Headers $cseHeaders

    # Retrieve booking details as CSE user
    $t49Detail = (Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$t49Id" -Method GET -Headers $cseHeaders).data
    $passed = ($t49Detail.status -eq "CANCELLATION_REQUESTED") -and ($t49Detail.cancellationReason -eq $specialReason)
    Report-Test 49 "Cancellation request preserves cancellation reason" $passed "Reason preserved exactly: '$($t49Detail.cancellationReason)'"
} catch {
    Report-Test 49 "Cancellation request preserves cancellation reason" $false $_.Exception.Message
}

# Test 50: Cancelled request remains in request history
try {
    # Query My Requests for CSE user and ensure $t42BookingId (cancelled in Test 44) is still present
    $myHistory = (Invoke-RestMethod -Uri "$baseUrl/seminar/requests/my" -Method GET -Headers $cseHeaders).data
    $cancelledEntry = $myHistory | Where-Object { $_.bookingId -eq $t42BookingId }
    $passed = ($null -ne $cancelledEntry) -and ($cancelledEntry.status -eq "CANCELLED")
    Report-Test 50 "Cancelled request remains in request history" $passed "Cancelled booking $t42BookingId persists in request history"
} catch {
    Report-Test 50 "Cancelled request remains in request history" $false $_.Exception.Message
}

# Test 51: Cancel THIS_OCCURRENCE affects only that occurrence
try {
    $d51Start = $base.AddDays(170).ToString("yyyy-MM-dd")
    $d51End = $base.AddDays(185).ToString("yyyy-MM-dd")
    $t51Body = @{
        bookingType = "RECURRING"; hallId = "SH-5"
        startDate = $d51Start; endDate = $d51End; slot = "FORENOON"
        recurrenceDays = @("MONDAY", "WEDNESDAY")
        eventTitle = "TEST 51 Recurring Single Cancel"; purpose = "Scope test"
        expectedParticipants = 45
    } | ConvertTo-Json
    $t51Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t51Body -Headers $cseHeaders
    $s51Id = $t51Res.data.seriesId
    $occ51 = (Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s51Id" -Method GET -Headers $cseHeaders).data

    # Cancel only the second occurrence
    $secondOcc = $occ51[1]
    $cancelOccBody = @{ reason = "Holiday on 2nd occurrence"; scope = "THIS_OCCURRENCE" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$($secondOcc.bookingId)/cancel" -Method POST -Body $cancelOccBody -Headers $cseHeaders

    # Verify series state
    $afterOcc51 = (Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s51Id" -Method GET -Headers $cseHeaders).data
    $targetCancelled = ($afterOcc51 | Where-Object { $_.bookingId -eq $secondOcc.bookingId }).status -eq "CANCELLED"
    $othersPending = ($afterOcc51 | Where-Object { $_.bookingId -ne $secondOcc.bookingId -and $_.status -eq "PENDING" }).Count -eq ($occ51.Count - 1)
    $passed = $targetCancelled -and $othersPending
    Report-Test 51 "Cancel THIS_OCCURRENCE affects only that occurrence" $passed "Occurrence $($secondOcc.bookingId) is CANCELLED; remaining $($occ51.Count - 1) occurrences remain PENDING"
} catch {
    Report-Test 51 "Cancel THIS_OCCURRENCE affects only that occurrence" $false $_.Exception.Message
}

# Test 52: Cancel ENTIRE_SERIES affects the entire series
try {
    $d52Start = $base.AddDays(190).ToString("yyyy-MM-dd")
    $d52End = $base.AddDays(200).ToString("yyyy-MM-dd")
    $t52Body = @{
        bookingType = "RECURRING"; hallId = "SH-1"
        startDate = $d52Start; endDate = $d52End; slot = "AFTERNOON"
        recurrenceDays = @("TUESDAY", "FRIDAY")
        eventTitle = "TEST 52 Recurring Entire Cancel"; purpose = "Entire series scope test"
        expectedParticipants = 70
    } | ConvertTo-Json
    $t52Res = Invoke-RestMethod -Uri "$baseUrl/seminar/requests" -Method POST -Body $t52Body -Headers $cseHeaders
    $s52Id = $t52Res.data.seriesId
    $firstOcc52 = $t52Res.data.bookingId

    # Cancel with ENTIRE_SERIES
    $cancelSeriesBody = @{ reason = "Department budget cut, entire series cancelled"; scope = "ENTIRE_SERIES" } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/seminar/requests/$firstOcc52/cancel" -Method POST -Body $cancelSeriesBody -Headers $cseHeaders

    # Verify all occurrences are cancelled
    $afterOcc52 = (Invoke-RestMethod -Uri "$baseUrl/seminar/series/$s52Id" -Method GET -Headers $cseHeaders).data
    $allOccCancelled = ($afterOcc52.Count -gt 0) -and (($afterOcc52 | Where-Object { $_.status -eq "CANCELLED" }).Count -eq $afterOcc52.Count)
    Report-Test 52 "Cancel ENTIRE_SERIES affects the entire series" $allOccCancelled "All $($afterOcc52.Count) occurrences in series $s52Id are CANCELLED"
} catch {
    Report-Test 52 "Cancel ENTIRE_SERIES affects the entire series" $false $_.Exception.Message
}

# =========================================================================
# FINAL SUMMARY AND EXIT CODE
# =========================================================================
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host " SEMINAR MODULE: 52-TEST SUITE EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Total Tests:  $global:totalTests"
Write-Host " Passed Tests: $global:passedTests" -ForegroundColor Green
Write-Host " Failed Tests: $global:failedTests" -ForegroundColor $(if ($global:failedTests -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================" -ForegroundColor Cyan

if ($global:failedTests -gt 0) {
    Write-Host "FAILURE: $global:failedTests test(s) failed." -ForegroundColor Red
    exit 1
} else {
    Write-Host "SUCCESS: All 52 verification tests passed!" -ForegroundColor Green
    exit 0
}

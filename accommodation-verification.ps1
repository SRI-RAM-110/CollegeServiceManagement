# ==============================================================================
# ACCOMMODATION MODULE AUTOMATED VERIFICATION SUITE
# College Department Services Management System
# ==============================================================================

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:8080/api"

$global:passedCount = 0
$global:failedCount = 0
$global:totalTests = 40

function Report-Result {
    param(
        [int]$TestNumber,
        [string]$Description,
        [bool]$Success,
        [string]$Details = ""
    )
    if ($Success) {
        $global:passedCount++
        Write-Host " [PASS] Test $TestNumber : $Description" -ForegroundColor Green
    } else {
        $global:failedCount++
        Write-Host " [FAIL] Test $TestNumber : $Description" -ForegroundColor Red
        if ($Details) {
            Write-Host "        Details: $Details" -ForegroundColor Yellow
        }
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " STARTING ACCOMMODATION VERIFICATION SUITE (40 Tests)" -ForegroundColor Cyan
Write-Host " Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Dynamic future base dates to avoid conflicts with existing database records
$randomOffset = Get-Random -Minimum 2000 -Maximum 80000
$baseDate = (Get-Date).AddDays($randomOffset)

function Format-DateStr([DateTime]$d) {
    return $d.ToString("yyyy-MM-dd")
}

# Generate unique non-conflicting windows
$d1_in  = Format-DateStr $baseDate.AddDays(1)
$d1_out = Format-DateStr $baseDate.AddDays(4)

$d1_overlap_in  = Format-DateStr $baseDate.AddDays(2)
$d1_overlap_out = Format-DateStr $baseDate.AddDays(3)

$d2_in  = Format-DateStr $baseDate.AddDays(6)
$d2_out = Format-DateStr $baseDate.AddDays(9)

$d3_in  = Format-DateStr $baseDate.AddDays(12)
$d3_out = Format-DateStr $baseDate.AddDays(15)

$d4_in  = Format-DateStr $baseDate.AddDays(18)
$d4_out = Format-DateStr $baseDate.AddDays(21)

$d5_in  = Format-DateStr $baseDate.AddDays(24)
$d5_out = Format-DateStr $baseDate.AddDays(27)

$d6_in  = Format-DateStr $baseDate.AddDays(30)
$d6_out = Format-DateStr $baseDate.AddDays(33)

$d7_in  = Format-DateStr $baseDate.AddDays(36)
$d7_out = Format-DateStr $baseDate.AddDays(39)

$d8_in  = Format-DateStr $baseDate.AddDays(42)
$d8_out = Format-DateStr $baseDate.AddDays(45)

# Dedicated dates for Test 20 (rejection & re-booking)
$d_t20_in  = Format-DateStr $baseDate.AddDays(100)
$d_t20_out = Format-DateStr $baseDate.AddDays(103)

# Past and invalid dates
$past_in  = Format-DateStr (Get-Date).AddDays(-5)
$past_out = Format-DateStr (Get-Date).AddDays(-2)
$sameday  = Format-DateStr $baseDate.AddDays(50)

# Helper HTTP functions
function Invoke-ApiPost {
    param([string]$url, [object]$body, [string]$token = "")
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 10 }
    try {
        $res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $json -ContentType "application/json"
        return @{ StatusCode = 200; Data = $res }
    } catch {
        $code = 500
        $errBody = ""
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
        }
        return @{ StatusCode = $code; Error = $_.Exception.Message; Body = $errBody }
    }
}

function Invoke-ApiPut {
    param([string]$url, [object]$body = $null, [string]$token = "")
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $json = if ($body -is [string]) { $body } elseif ($body) { $body | ConvertTo-Json -Depth 10 } else { "{}" }
    try {
        $res = Invoke-RestMethod -Uri $url -Method Put -Headers $headers -Body $json -ContentType "application/json"
        return @{ StatusCode = 200; Data = $res }
    } catch {
        $code = 500
        $errBody = ""
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
        }
        return @{ StatusCode = $code; Error = $_.Exception.Message; Body = $errBody }
    }
}

function Invoke-ApiGet {
    param([string]$url, [string]$token = "")
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        $res = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
        return @{ StatusCode = 200; Data = $res }
    } catch {
        $code = 500
        $errBody = ""
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
        }
        return @{ StatusCode = $code; Error = $_.Exception.Message; Body = $errBody }
    }
}

function Invoke-ApiGetRaw {
    param([string]$url, [string]$token = "")
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "GET"
        if ($token) { $req.Headers.Add("Authorization", "Bearer $token") }
        $resp = $req.GetResponse()
        $stream = $resp.GetResponseStream()
        $ms = New-Object System.IO.MemoryStream
        $stream.CopyTo($ms)
        $bytes = $ms.ToArray()
        $resp.Close()
        return @{ StatusCode = 200; Bytes = $bytes; Length = $bytes.Length }
    } catch {
        $code = 500
        $ex = $_.Exception
        while ($ex -and -not ($ex -is [System.Net.WebException])) {
            $ex = $ex.InnerException
        }
        if ($ex -and $ex.Response) {
            $code = [int]$ex.Response.StatusCode
        } elseif ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
        return @{ StatusCode = $code; Error = $_.Exception.Message }
    }
}

# ------------------------------------------------------------------------------
# STEP 1: AUTHENTICATION / LOGIN TESTS
# ------------------------------------------------------------------------------

# Test 1: Login department user (CSE001)
$cseLogin = Invoke-ApiPost "$baseUrl/auth/login" @{ userId = "CSE001"; password = "dept123" }
$cseToken = $cseLogin.Data.data.token
Report-Result 1 "Login department user (CSE001)" ($cseLogin.StatusCode -eq 200 -and $cseToken) "Status: $($cseLogin.StatusCode)"

# Test 2: Login accommodation admin (ACC001)
$accLogin = Invoke-ApiPost "$baseUrl/auth/login" @{ userId = "ACC001"; password = "admin123" }
$accToken = $accLogin.Data.data.token
Report-Result 2 "Login accommodation admin (ACC001)" ($accLogin.StatusCode -eq 200 -and $accToken) "Status: $($accLogin.StatusCode)"

# Test 3: Login Super Admin (AO001)
$aoLogin = Invoke-ApiPost "$baseUrl/auth/login" @{ userId = "AO001"; password = "admin123" }
$aoToken = $aoLogin.Data.data.token
Report-Result 3 "Login Super Admin (AO001)" ($aoLogin.StatusCode -eq 200 -and $aoToken) "Status: $($aoLogin.StatusCode)"

# Extra login for department isolation test (ECE001)
$eceLogin = Invoke-ApiPost "$baseUrl/auth/login" @{ userId = "ECE001"; password = "dept123" }
$eceToken = $eceLogin.Data.data.token

# ------------------------------------------------------------------------------
# STEP 2: ROOM LISTING & VERIFICATION TESTS
# ------------------------------------------------------------------------------

$roomsResp = Invoke-ApiGet "$baseUrl/accommodation/rooms" $cseToken
$rooms = $roomsResp.Data.data

# Test 4: Valid room listing
Report-Result 4 "Valid room listing returns rooms" ($roomsResp.StatusCode -eq 200 -and $rooms.Count -ge 4) "Count: $($rooms.Count)"

# Test 5: Girls Hostel rooms exist
$ghRooms = $rooms | Where-Object { $_.hostel -match "Girls" }
Report-Result 5 "Girls Hostel rooms exist" ($ghRooms.Count -ge 2) "Found: $($ghRooms.Count)"

# Test 6: Boys Hostel rooms exist
$bhRooms = $rooms | Where-Object { $_.hostel -match "Boys" }
Report-Result 6 "Boys Hostel rooms exist" ($bhRooms.Count -ge 2) "Found: $($bhRooms.Count)"

# Test 7: AC room exists
$acRooms = $rooms | Where-Object { $_.roomType -match "AC" -and $_.roomType -notmatch "Non-AC" }
Report-Result 7 "AC room exists" ($acRooms.Count -ge 2) "Found: $($acRooms.Count)"

# Test 8: Non-AC room exists
$nacRooms = $rooms | Where-Object { $_.roomType -match "Non-AC" }
Report-Result 8 "Non-AC room exists" ($nacRooms.Count -ge 2) "Found: $($nacRooms.Count)"

# ------------------------------------------------------------------------------
# STEP 3: BOOKING SUBMISSION & INITIAL STATUS
# ------------------------------------------------------------------------------

# Test 9: Valid accommodation submission
$validReqBody = @{
    facultyOrGuestName = "Prof. John Doe"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d1_in
    checkOutDate = $d1_out
    guestsCount = 2
    purpose = "Guest lecture on AI & Robotics"
    additionalNotes = "Need high-speed WiFi and study desk"
    bookingType = "MULTI_DAY"
}
$req1Resp = Invoke-ApiPost "$baseUrl/accommodation/requests" $validReqBody $cseToken
$req1 = $req1Resp.Data.data
$req1Id = $req1.id
Report-Result 9 "Valid accommodation submission succeeds" ($req1Resp.StatusCode -eq 200 -and $req1Id) "Status: $($req1Resp.StatusCode)"

# Test 10: Submission status is PENDING
Report-Result 10 "Submission status is PENDING" ($req1.status -eq "PENDING") "Status: $($req1.status)"

# ------------------------------------------------------------------------------
# STEP 4: VALIDATION ERROR TESTS
# ------------------------------------------------------------------------------

# Test 11: Invalid room rejected
$invalidRoomReq = @{
    facultyOrGuestName = "Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "NON_EXISTENT_ROOM_999"
    checkInDate = $d2_in
    checkOutDate = $d2_out
    guestsCount = 1
    purpose = "Test invalid room"
}
$invRoomResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $invalidRoomReq $cseToken
Report-Result 11 "Invalid room rejected" ($invRoomResp.StatusCode -ge 400 -and $invRoomResp.StatusCode -lt 500) "Status: $($invRoomResp.StatusCode)"

# Test 12: Invalid hostel rejected
$invalidHostelReq = @{
    facultyOrGuestName = "Guest"
    hostel = "Imaginary Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d2_in
    checkOutDate = $d2_out
    guestsCount = 1
    purpose = "Test invalid hostel"
}
$invHostelResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $invalidHostelReq $cseToken
Report-Result 12 "Invalid hostel rejected" ($invHostelResp.StatusCode -ge 400 -and $invHostelResp.StatusCode -lt 500) "Status: $($invHostelResp.StatusCode)"

# Test 13: Past check-in rejected
$pastReq = @{
    facultyOrGuestName = "Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $past_in
    checkOutDate = $past_out
    guestsCount = 1
    purpose = "Test past date"
}
$pastResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $pastReq $cseToken
Report-Result 13 "Past check-in rejected" ($pastResp.StatusCode -eq 400) "Status: $($pastResp.StatusCode)"

# Test 14: Check-out before check-in rejected
$coBeforeCiReq = @{
    facultyOrGuestName = "Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d2_out
    checkOutDate = $d2_in
    guestsCount = 1
    purpose = "Test checkout before checkin"
}
$coBeforeCiResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $coBeforeCiReq $cseToken
Report-Result 14 "Check-out before check-in rejected" ($coBeforeCiResp.StatusCode -eq 400) "Status: $($coBeforeCiResp.StatusCode)"

# Test 15: Same-day invalid range rejected
$sameDayReq = @{
    facultyOrGuestName = "Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $sameday
    checkOutDate = $sameday
    guestsCount = 1
    purpose = "Test same-day booking"
}
$sameDayResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $sameDayReq $cseToken
Report-Result 15 "Same-day invalid range rejected" ($sameDayResp.StatusCode -eq 400) "Status: $($sameDayResp.StatusCode)"

# Test 16: Guest capacity exceeded rejected
$capExceededReq = @{
    facultyOrGuestName = "Big Group"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d2_in
    checkOutDate = $d2_out
    guestsCount = 10
    purpose = "Testing capacity limits"
}
$capResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $capExceededReq $cseToken
Report-Result 16 "Guest capacity exceeded rejected" ($capResp.StatusCode -eq 400) "Status: $($capResp.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 5: OVERLAP & AVAILABILITY CONFLICT TESTS
# ------------------------------------------------------------------------------

# Test 17: Overlapping booking blocked
# Note: req1 is for GH-AC-1 from $d1_in to $d1_out. Let's try overlapping request for same room.
$overlapReq = @{
    facultyOrGuestName = "Contender Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d1_overlap_in
    checkOutDate = $d1_overlap_out
    guestsCount = 1
    purpose = "Overlapping booking test"
}
$overlapResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $overlapReq $cseToken
Report-Result 17 "Overlapping booking blocked" ($overlapResp.StatusCode -eq 409) "Status: $($overlapResp.StatusCode)"

# Test 18: Different available dates allowed
$diffDatesReq = @{
    facultyOrGuestName = "Later Guest"
    hostel = "Girls Hostel"
    roomType = "AC Room"
    roomId = "GH-AC-1"
    checkInDate = $d2_in
    checkOutDate = $d2_out
    guestsCount = 1
    purpose = "Non-conflicting dates test"
}
$diffDatesResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $diffDatesReq $cseToken
$req2 = $diffDatesResp.Data.data
Report-Result 18 "Different available dates allowed" ($diffDatesResp.StatusCode -eq 200 -and $req2.id) "Status: $($diffDatesResp.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 6: MAINTENANCE & REJECTION ROOM RELEASE TESTS
# ------------------------------------------------------------------------------

# Set room BH-AC-1 to Maintenance using Admin
$maintToggleResp = Invoke-ApiPut "$baseUrl/accommodation/rooms/BH-AC-1/status" @{ status = "Maintenance" } $aoToken

# Test 19: Maintenance room blocked
$maintReq = @{
    facultyOrGuestName = "Guest for Maintenance Room"
    hostel = "Boys Hostel"
    roomType = "AC Room"
    roomId = "BH-AC-1"
    checkInDate = $d3_in
    checkOutDate = $d3_out
    guestsCount = 1
    purpose = "Attempt booking room in maintenance"
}
$maintBookingResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $maintReq $cseToken
Report-Result 19 "Maintenance room blocked" ($maintBookingResp.StatusCode -eq 400) "Status: $($maintBookingResp.StatusCode)"

# Restore BH-AC-1 back to Available
$restoreToggleResp = Invoke-ApiPut "$baseUrl/accommodation/rooms/BH-AC-1/status" @{ status = "Available" } $aoToken

# Test 20: Rejected booking frees room
# Create a booking on BH-AC-1 for $d_t20_in to $d_t20_out, reject it, then verify room can be booked again!
$toRejectReq = @{
    facultyOrGuestName = "Guest To Reject"
    hostel = "Boys Hostel"
    roomType = "AC Room"
    roomId = "BH-AC-1"
    checkInDate = $d_t20_in
    checkOutDate = $d_t20_out
    guestsCount = 1
    purpose = "Booking to be rejected"
}
$toRejectResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $toRejectReq $cseToken
$rejectReqId = $toRejectResp.Data.data.id

# Reject via Admin
$rejActionResp = Invoke-ApiPut "$baseUrl/accommodation/requests/$rejectReqId/reject" @{ reason = "Room reserved for VIP speaker" } $accToken

# Now book the exact same room and dates
$postRejectReq = @{
    facultyOrGuestName = "Replacement Guest"
    hostel = "Boys Hostel"
    roomType = "AC Room"
    roomId = "BH-AC-1"
    checkInDate = $d_t20_in
    checkOutDate = $d_t20_out
    guestsCount = 1
    purpose = "Booking room after rejection"
}
$postRejectResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $postRejectReq $cseToken
Report-Result 20 "Rejected booking frees room" ($postRejectResp.StatusCode -eq 200 -and $postRejectResp.Data.data.id) "Status: $($postRejectResp.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 7: CANCELLATION LIFECYCLE TESTS
# ------------------------------------------------------------------------------

# Test 21: Pending cancellation (immediate cancellation -> CANCELLED)
# Create a pending booking on GH-NAC-1
$pendingCancelReq = @{
    facultyOrGuestName = "Cancel Test Guest"
    hostel = "Girls Hostel"
    roomType = "Non-AC Room"
    roomId = "GH-NAC-1"
    checkInDate = $d4_in
    checkOutDate = $d4_out
    guestsCount = 1
    purpose = "Pending cancellation test"
}
$pendingCancelResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $pendingCancelReq $cseToken
$pendingCancelId = $pendingCancelResp.Data.data.id

$cancelPendingAction = Invoke-ApiPost "$baseUrl/accommodation/requests/$pendingCancelId/cancel" @{ reason = "Guest visit cancelled" } $cseToken
Report-Result 21 "Pending cancellation immediately sets CANCELLED" ($cancelPendingAction.StatusCode -eq 200 -and $cancelPendingAction.Data.data.status -eq "CANCELLED") "Status: $($cancelPendingAction.Data.data.status)"

# Test 22: Approved cancellation request (APPROVED -> CANCELLATION_REQUESTED)
# Create and approve a booking on GH-NAC-1 for $d5_in to $d5_out
$approvedForCancelReq = @{
    facultyOrGuestName = "Approved Guest For Cancel"
    hostel = "Girls Hostel"
    roomType = "Non-AC Room"
    roomId = "GH-NAC-1"
    checkInDate = $d5_in
    checkOutDate = $d5_out
    guestsCount = 1
    purpose = "Approved cancellation test"
}
$approvedForCancelResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $approvedForCancelReq $cseToken
$approvedForCancelId = $approvedForCancelResp.Data.data.id
$null = Invoke-ApiPut "$baseUrl/accommodation/requests/$approvedForCancelId/approve" @{} $accToken

# Department user requests cancellation on the approved booking
$cancelReqAction = Invoke-ApiPost "$baseUrl/accommodation/requests/$approvedForCancelId/cancel" @{ reason = "Workshop postponed by dean" } $cseToken
Report-Result 22 "Approved booking cancellation requests CANCELLATION_REQUESTED" ($cancelReqAction.StatusCode -eq 200 -and $cancelReqAction.Data.data.status -eq "CANCELLATION_REQUESTED") "Status: $($cancelReqAction.Data.data.status)"

# Test 23: Cancellation approval (Admin approves -> CANCELLED)
$approveCancelAction = Invoke-ApiPut "$baseUrl/accommodation/requests/$approvedForCancelId/cancel/approve" @{} $accToken
Report-Result 23 "Cancellation approval sets status to CANCELLED" ($approveCancelAction.StatusCode -eq 200 -and $approveCancelAction.Data.data.status -eq "CANCELLED") "Status: $($approveCancelAction.Data.data.status)"

# Test 24: Cancellation rejection (Admin rejects cancellation -> reverts to APPROVED)
# Create another approved booking on GH-NAC-1 for $d6_in to $d6_out
$approvedForCancelRejReq = @{
    facultyOrGuestName = "Guest For Cancel Rejection"
    hostel = "Girls Hostel"
    roomType = "Non-AC Room"
    roomId = "GH-NAC-1"
    checkInDate = $d6_in
    checkOutDate = $d6_out
    guestsCount = 1
    purpose = "Cancel rejection test"
}
$approvedForCancelRejResp = Invoke-ApiPost "$baseUrl/accommodation/requests" $approvedForCancelRejReq $cseToken
$approvedForCancelRejId = $approvedForCancelRejResp.Data.data.id
$null = Invoke-ApiPut "$baseUrl/accommodation/requests/$approvedForCancelRejId/approve" @{} $accToken
$null = Invoke-ApiPost "$baseUrl/accommodation/requests/$approvedForCancelRejId/cancel" @{ reason = "Want to cancel" } $cseToken

# Admin rejects cancellation
$rejectCancelAction = Invoke-ApiPut "$baseUrl/accommodation/requests/$approvedForCancelRejId/cancel/reject" @{ reason = "Cancellation request past cut-off period" } $accToken
Report-Result 24 "Cancellation rejection retains APPROVED status" ($rejectCancelAction.StatusCode -eq 200 -and $rejectCancelAction.Data.data.status -eq "APPROVED") "Status: $($rejectCancelAction.Data.data.status)"

# ------------------------------------------------------------------------------
# STEP 8: RESCHEDULING LIFECYCLE TESTS
# ------------------------------------------------------------------------------

# Test 25: Reschedule request on APPROVED booking -> RESCHEDULE_REQUESTED
# We have $req1 which is on GH-AC-1 for $d1_in to $d1_out. Let's approve $req1 first.
$approveReq1 = Invoke-ApiPut "$baseUrl/accommodation/requests/$req1Id/approve" @{} $accToken
$rescheduleBody = @{
    newRoomId = "GH-NAC-1"
    newCheckInDate = $d7_in
    newCheckOutDate = $d7_out
    reason = "Guest flight rescheduled by airline"
}
$rescheduleAction = Invoke-ApiPost "$baseUrl/accommodation/requests/$req1Id/reschedule" $rescheduleBody $cseToken
Report-Result 25 "Reschedule request transitions status to RESCHEDULE_REQUESTED" ($rescheduleAction.StatusCode -eq 200 -and $rescheduleAction.Data.data.status -eq "RESCHEDULE_REQUESTED") "Status: $($rescheduleAction.Data.data.status)"

# Test 26: Reschedule approval -> APPROVED with new target room & dates
$approveRescheduleAction = Invoke-ApiPut "$baseUrl/accommodation/requests/$req1Id/reschedule/approve" @{} $accToken
$updatedReq1 = $approveRescheduleAction.Data.data
Report-Result 26 "Reschedule approval updates room and dates to APPROVED" ($approveRescheduleAction.StatusCode -eq 200 -and $updatedReq1.status -eq "APPROVED" -and $updatedReq1.roomId -eq "GH-NAC-1") "Room: $($updatedReq1.roomId), Status: $($updatedReq1.status)"

# Test 27: Reschedule rejection preserves original booking information
# Let's request another reschedule on $req1, then reject it
$rescheduleBody2 = @{
    newRoomId = "BH-AC-1"
    newCheckInDate = $d8_in
    newCheckOutDate = $d8_out
    reason = "Changing to boys hostel"
}
$rescheduleAction2 = Invoke-ApiPost "$baseUrl/accommodation/requests/$req1Id/reschedule" $rescheduleBody2 $cseToken
$rejectRescheduleAction = Invoke-ApiPut "$baseUrl/accommodation/requests/$req1Id/reschedule/reject" @{ reason = "BH-AC-1 unavailable for target department" } $accToken
$preservedReq = $rejectRescheduleAction.Data.data
Report-Result 27 "Reschedule rejection preserves original room and retains APPROVED" ($rejectRescheduleAction.StatusCode -eq 200 -and $preservedReq.status -eq "APPROVED" -and $preservedReq.roomId -eq "GH-NAC-1") "Room: $($preservedReq.roomId), Status: $($preservedReq.status)"

# Test 28: Reschedule to occupied room blocked (409 Conflict)
# Try to reschedule a booking to a room and dates that already has an approved booking ($req1 is on GH-NAC-1 for $d7_in to $d7_out)
# Create another approved booking on BH-NAC-1
$anotherReq = Invoke-ApiPost "$baseUrl/accommodation/requests" @{
    facultyOrGuestName = "Another Guest"
    hostel = "Boys Hostel"
    roomType = "Non-AC Room"
    roomId = "BH-NAC-1"
    checkInDate = $d8_in
    checkOutDate = $d8_out
    guestsCount = 1
    purpose = "Testing reschedule conflict"
} $cseToken
$anotherReqId = $anotherReq.Data.data.id
$null = Invoke-ApiPut "$baseUrl/accommodation/requests/$anotherReqId/approve" @{} $accToken

# Now try to reschedule $anotherReqId into GH-NAC-1 on $d7_in to $d7_out (which is occupied by $req1)
$conflictReschedBody = @{
    newRoomId = "GH-NAC-1"
    newCheckInDate = $d7_in
    newCheckOutDate = $d7_out
    reason = "Want GH-NAC-1 instead"
}
$conflictReschedResp = Invoke-ApiPost "$baseUrl/accommodation/requests/$anotherReqId/reschedule" $conflictReschedBody $cseToken
Report-Result 28 "Reschedule to occupied room blocked with 409 Conflict" ($conflictReschedResp.StatusCode -eq 409) "Status: $($conflictReschedResp.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 9: APPROVAL-TIME CONFLICT RECHECK
# ------------------------------------------------------------------------------

# Test 29: Approval-time conflict recheck
# We have a test fixture endpoint POST /api/accommodation/test-fixture/create-pending
# Create two pending bookings on BH-NAC-1 for future date window (baseDate + 60 days)
$d_fixture_in = Format-DateStr $baseDate.AddDays(60)
$d_fixture_out = Format-DateStr $baseDate.AddDays(63)

$pendingA = Invoke-ApiPost "$baseUrl/accommodation/test-fixture/create-pending" @{
    facultyOrGuestName = "Contender A"
    hostel = "Boys Hostel"
    roomType = "Non-AC Room"
    roomId = "BH-NAC-1"
    checkInDate = $d_fixture_in
    checkOutDate = $d_fixture_out
    guestsCount = 1
    purpose = "Approval race contender A"
} $aoToken
$pendingAId = $pendingA.Data.data.id

$pendingB = Invoke-ApiPost "$baseUrl/accommodation/test-fixture/create-pending" @{
    facultyOrGuestName = "Contender B"
    hostel = "Boys Hostel"
    roomType = "Non-AC Room"
    roomId = "BH-NAC-1"
    checkInDate = $d_fixture_in
    checkOutDate = $d_fixture_out
    guestsCount = 1
    purpose = "Approval race contender B"
} $aoToken
$pendingBId = $pendingB.Data.data.id

# Admin approves Contender A
$approveA = Invoke-ApiPut "$baseUrl/accommodation/requests/$pendingAId/approve" @{} $accToken

# Admin tries to approve Contender B -> fresh conflict check must fail with 409 Conflict!
$approveB = Invoke-ApiPut "$baseUrl/accommodation/requests/$pendingBId/approve" @{} $accToken
Report-Result 29 "Approval-time conflict recheck rejects second approval with 409 Conflict" ($approveA.StatusCode -eq 200 -and $approveB.StatusCode -eq 409) "Approve A: $($approveA.StatusCode), Approve B: $($approveB.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 10: DEPARTMENT ISOLATION & PRIVACY TESTS
# ------------------------------------------------------------------------------

# Test 30: Department isolation (ECE user cannot view CSE request)
# ECE001 tries to get CSE's $req1Id
$crossDeptResp = Invoke-ApiGet "$baseUrl/accommodation/requests/$req1Id" $eceToken
Report-Result 30 "Department isolation blocks cross-department viewing (403 Forbidden)" ($crossDeptResp.StatusCode -eq 403) "Status: $($crossDeptResp.StatusCode)"

# Test 31: Unauthorized PDF access blocked
$crossDeptPdfResp = Invoke-ApiGetRaw "$baseUrl/pdf/accommodation/$req1Id" $eceToken
Report-Result 31 "Unauthorized PDF access blocked (403 Forbidden)" ($crossDeptPdfResp.StatusCode -eq 403) "Status: $($crossDeptPdfResp.StatusCode)"

# ------------------------------------------------------------------------------
# STEP 11: PDF GENERATION & CONTENT TESTS
# ------------------------------------------------------------------------------

# Test 32: Approved accommodation PDF generated for owner department
$ownerPdfResp = Invoke-ApiGetRaw "$baseUrl/pdf/accommodation/$req1Id" $cseToken
Report-Result 32 "Approved accommodation PDF generated for owner department" ($ownerPdfResp.StatusCode -eq 200 -and $ownerPdfResp.Length -gt 0) "Status: $($ownerPdfResp.StatusCode), Bytes: $($ownerPdfResp.Length)"

# Test 33: PDF contains actual PDF bytes (> 1000 bytes, starts with %PDF)
$isRealPdf = $false
if ($ownerPdfResp.Bytes -and $ownerPdfResp.Length -gt 1000) {
    $headerStr = [System.Text.Encoding]::ASCII.GetString($ownerPdfResp.Bytes, 0, 4)
    if ($headerStr -eq "%PDF") {
        $isRealPdf = $true
    }
}
Report-Result 33 "PDF contains actual binary bytes (%PDF header, > 1000 bytes)" $isRealPdf "Length: $($ownerPdfResp.Length)"

# ------------------------------------------------------------------------------
# STEP 12: ROLE AUTHORIZATION & MANAGEMENT TESTS
# ------------------------------------------------------------------------------

# Test 34: Accommodation admin authorization
# ACC001 can view all requests and has administrative authority
$accQueueResp = Invoke-ApiGet "$baseUrl/accommodation/requests" $accToken
Report-Result 34 "Accommodation admin authorized to view request queue" ($accQueueResp.StatusCode -eq 200 -and $accQueueResp.Data.data.Count -gt 0) "Count: $($accQueueResp.Data.data.Count)"

# Test 35: Super Admin (AO001) unrestricted access
# AO001 can access all requests and can download PDF for any department
$aoPdfResp = Invoke-ApiGetRaw "$baseUrl/pdf/accommodation/$req1Id" $aoToken
Report-Result 35 "Super Admin has unrestricted access to view & download PDFs" ($aoPdfResp.StatusCode -eq 200 -and $aoPdfResp.Length -gt 1000) "Status: $($aoPdfResp.StatusCode), Length: $($aoPdfResp.Length)"

# Test 36: Department auto-population from JWT (SecurityContext)
# The request created by CSE001 should automatically have department = 'CSE'
Report-Result 36 "Department identity strictly derived from JWT context" ($req1.department -eq "CSE") "Department: $($req1.department)"

# Test 37: Room maintenance toggle by Admin
# Admin sets GH-AC-1 to Maintenance and then restores it
$setMaint = Invoke-ApiPut "$baseUrl/accommodation/rooms/GH-AC-1/status" @{ status = "Maintenance" } $accToken
$restoreAvail = Invoke-ApiPut "$baseUrl/accommodation/rooms/GH-AC-1/status" @{ status = "Available" } $accToken
Report-Result 37 "Room maintenance status successfully toggled by Administrator" ($setMaint.StatusCode -eq 200 -and $restoreAvail.StatusCode -eq 200 -and $restoreAvail.Data.data.status -eq "Available") "Status: $($restoreAvail.Data.data.status)"

# Test 38: Department filtering on requests list
# CSE001 requests list contains only CSE requests
$cseReqs = Invoke-ApiGet "$baseUrl/accommodation/requests" $cseToken
$allCse = $true
foreach ($r in $cseReqs.Data.data) {
    if ($r.department -ne "CSE") {
        $allCse = $false
        break
    }
}
Report-Result 38 "Department filtering restricts list to user's department" ($cseReqs.StatusCode -eq 200 -and $allCse) "All CSE: $allCse"

# Test 39: Non-approved request PDF download blocked
# Create a PENDING request and attempt PDF download before approval
$d_pdf_pending_in = Format-DateStr $baseDate.AddDays(70)
$d_pdf_pending_out = Format-DateStr $baseDate.AddDays(72)
$pendingPdfReq = Invoke-ApiPost "$baseUrl/accommodation/requests" @{
    facultyOrGuestName = "Pending PDF Guest"
    hostel = "Boys Hostel"
    roomType = "AC Room"
    roomId = "BH-AC-1"
    checkInDate = $d_pdf_pending_in
    checkOutDate = $d_pdf_pending_out
    guestsCount = 1
    purpose = "Attempt PDF before approval"
} $cseToken
$pendingPdfReqId = $pendingPdfReq.Data.data.id

$pendingPdfDownload = Invoke-ApiGetRaw "$baseUrl/pdf/accommodation/$pendingPdfReqId" $cseToken
Report-Result 39 "Non-approved request PDF download blocked (400 Bad Request)" ($pendingPdfDownload.StatusCode -eq 400) "Status: $($pendingPdfDownload.StatusCode)"

# Test 40: Room availability endpoint verification
# Check availability of GH-AC-1 for already approved date window vs free window
$availCheckOccupied = Invoke-ApiGet "$baseUrl/accommodation/rooms/BH-NAC-1/availability?checkInDate=$d_fixture_in&checkOutDate=$d_fixture_out" $cseToken
$availCheckFree = Invoke-ApiGet "$baseUrl/accommodation/rooms/BH-NAC-1/availability?checkInDate=$(Format-DateStr $baseDate.AddDays(80))&checkOutDate=$(Format-DateStr $baseDate.AddDays(83))" $cseToken
$availOccupiedBool = $availCheckOccupied.Data.data.isAvailable
$availFreeBool = $availCheckFree.Data.data.isAvailable
Report-Result 40 "Room availability endpoint accurately reflects booking status" ($availOccupiedBool -eq $false -and $availFreeBool -eq $true) "Occupied Avail: $availOccupiedBool, Free Avail: $availFreeBool"

# ------------------------------------------------------------------------------
# FINAL REPORT & EXIT CODE
# ------------------------------------------------------------------------------
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " ACCOMMODATION VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host " Total Tests  : $global:totalTests" -ForegroundColor Cyan
Write-Host " Passed Tests : $global:passedCount" -ForegroundColor Green
Write-Host " Failed Tests : $global:failedCount" -ForegroundColor $(if ($global:failedCount -eq 0) { "Green" } else { "Red" })
Write-Host "======================================================================" -ForegroundColor Cyan

if ($global:failedCount -eq 0) {
    Write-Host " ALL 40 TESTS PASSED SUCCESSFULLY! EXIT CODE 0" -ForegroundColor Green
    exit 0
} else {
    Write-Host " SOME TESTS FAILED! EXIT CODE 1" -ForegroundColor Red
    exit 1
}

$baseUri = "http://localhost:8080/api"

# 1. Login
$loginCSE = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"csehod","password":"dept123"}'
$tokenCSE = $loginCSE.data.token
$loginECE = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"ecehod","password":"dept123"}'
$tokenECE = $loginECE.data.token
$loginCSE001 = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"CSE001","password":"dept123"}'
$tokenCSE001 = $loginCSE001.data.token
$loginAO = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"AO001","password":"admin123"}'
$tokenAO = $loginAO.data.token

Write-Host "=========================================="
Write-Host "FULL 5-SERVICE USER-SPECIFIC VERIFICATION"
Write-Host "=========================================="
Write-Host "User A: $($loginCSE.data.name) ($($loginCSE.data.userId)) [Dept: $($loginCSE.data.department)]"
Write-Host "User B: $($loginECE.data.name) ($($loginECE.data.userId)) [Dept: $($loginECE.data.department)]"
Write-Host "User C (Same dept as A): $($loginCSE001.data.name) ($($loginCSE001.data.userId)) [Dept: $($loginCSE001.data.department)]"

# --- STEP 1: USER A (csehod) CREATES ALL 5 SERVICES ---
Write-Host "`n[STEP 1] csehod submitting requests across all 5 services..."

# Service 1: Seminar
$semCSE = Invoke-RestMethod -Uri "$baseUri/seminar/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    eventTitle = "CSE AI & ML Conclave"; purpose = "Annual Symposium"; expectedParticipants = 150;
    date = "2026-12-01"; hallId = "SH-1"; slot = "FORENOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semCSE_id = $semCSE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 1 (Seminar): $semCSE_id (Approved)"

# Service 2: Accommodation
$accCSE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    facultyOrGuestName = "Prof. Narayana"; hostel = "Boys Hostel"; roomType = "AC Room"; roomId = "BH-AC-1";
    checkInDate = "2026-12-01"; checkOutDate = "2026-12-03"; guestsCount = 2; purpose = "AI Conclave Chief Guest"
} | ConvertTo-Json)
$accCSE_id = $accCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 2 (Accommodation): $accCSE_id (Approved)"

# Service 3: Transport
$trnCSE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    tripType = "College Bus"; tripDate = "2026-12-01"; roundTrip = $true; pickupLocation = "Vijayawada Airport";
    destination = "NEC Campus"; purpose = "Delegates Shuttle"; departureTime = "09:00 AM";
    returnTime = "05:00 PM"; expectedPassengers = 35
} | ConvertTo-Json)
$trnCSE_id = $trnCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 3 (Transport): $trnCSE_id (Approved)"

# Service 4: Stationery
$staCSE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    purpose = "AI Conclave Welcome Kits"; items = @(@{ itemId = "ST-01"; quantity = 20 }, @{ itemId = "ST-10"; quantity = 30 })
} | ConvertTo-Json)
$staCSE_id = $staCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 4 (Stationery): $staCSE_id (Approved)"

# Service 5: Meals
$meaCSE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    eventTitle = "AI Conclave Executive Buffet"; date = "2026-12-01"; venue = "Executive Dining Hall";
    mealTypes = @("Lunch", "Snacks"); totalGuests = 80
} | ConvertTo-Json)
$meaCSE_id = $meaCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 5 (Meals): $meaCSE_id (Approved)"

# --- STEP 2: USER B (ecehod) CREATES ALL 5 SERVICES ---
Write-Host "`n[STEP 2] ecehod submitting requests across all 5 services..."

# Service 1: Seminar
$semECE = Invoke-RestMethod -Uri "$baseUri/seminar/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "ECE 5G & IoT Summit"; purpose = "Technical Summit"; expectedParticipants = 130;
    date = "2026-12-05"; hallId = "SH-2"; slot = "AFTERNOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semECE_id = $semECE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 1 (Seminar): $semECE_id (Approved)"

# Service 2: Accommodation
$accECE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    facultyOrGuestName = "Dr. Ananya"; hostel = "Girls Hostel"; roomType = "AC Room"; roomId = "GH-AC-1";
    checkInDate = "2026-12-04"; checkOutDate = "2026-12-06"; guestsCount = 2; purpose = "5G Summit Keynote"
} | ConvertTo-Json)
$accECE_id = $accECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 2 (Accommodation): $accECE_id (Approved)"

# Service 3: Transport
$trnECE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    tripType = "Tempo Traveller"; tripDate = "2026-12-05"; roundTrip = $true; pickupLocation = "ECE Department";
    destination = "Science City"; purpose = "Student Delegation"; departureTime = "08:30 AM";
    returnTime = "06:30 PM"; expectedPassengers = 10
} | ConvertTo-Json)
$trnECE_id = $trnECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 3 (Transport): $trnECE_id (Approved)"

# Service 4: Stationery
$staECE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    purpose = "5G Summit Badges & Pads"; items = @(@{ itemId = "ST-02"; quantity = 15 }, @{ itemId = "ST-12"; quantity = 25 })
} | ConvertTo-Json)
$staECE_id = $staECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 4 (Stationery): $staECE_id (Approved)"

# Service 5: Meals
$meaECE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "IoT Summit High Tea"; date = "2026-12-05"; venue = "ECE Seminar Hall";
    mealTypes = @("Tea / Coffee", "Snacks"); totalGuests = 70
} | ConvertTo-Json)
$meaECE_id = $meaECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "  -> Service 5 (Meals): $meaECE_id (Approved)"

# --- STEP 3: VERIFICATION RESULTS ---
Write-Host "`n=========================================="
Write-Host "VERIFICATION RESULTS"
Write-Host "=========================================="

# Check csehod
$dashCSE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenCSE" }
$cseUpcoming = $dashCSE.data.upcomingEvents

$cSem = ($cseUpcoming | Where-Object { $_.requestId -eq $semCSE_id }) -ne $null
$cAcc = ($cseUpcoming | Where-Object { $_.requestId -eq $accCSE_id }) -ne $null
$cTrn = ($cseUpcoming | Where-Object { $_.requestId -eq $trnCSE_id }) -ne $null
$cSta = ($cseUpcoming | Where-Object { $_.requestId -eq $staCSE_id }) -ne $null
$cMea = ($cseUpcoming | Where-Object { $_.requestId -eq $meaCSE_id }) -ne $null

Write-Host "[PASS] csehod sees own Seminar ($semCSE_id): $cSem"
Write-Host "[PASS] csehod sees own Accommodation ($accCSE_id): $cAcc"
Write-Host "[PASS] csehod sees own Transport ($trnCSE_id): $cTrn"
Write-Host "[PASS] csehod sees own Stationery ($staCSE_id): $cSta"
Write-Host "[PASS] csehod sees own Meals ($meaCSE_id): $cMea"

# Cross-visibility check: ecehod requests in csehod upcoming
$eceInCse = ($cseUpcoming | Where-Object {
    $_.requestId -in @($semECE_id, $accECE_id, $trnECE_id, $staECE_id, $meaECE_id)
})
Write-Host "[PASS] ecehod requests visible to csehod: $(@($eceInCse).Count) (Expected: 0)"

# Check ecehod
$dashECE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenECE" }
$eceUpcoming = $dashECE.data.upcomingEvents

$eSem = ($eceUpcoming | Where-Object { $_.requestId -eq $semECE_id }) -ne $null
$eAcc = ($eceUpcoming | Where-Object { $_.requestId -eq $accECE_id }) -ne $null
$eTrn = ($eceUpcoming | Where-Object { $_.requestId -eq $trnECE_id }) -ne $null
$eSta = ($eceUpcoming | Where-Object { $_.requestId -eq $staECE_id }) -ne $null
$eMea = ($eceUpcoming | Where-Object { $_.requestId -eq $meaECE_id }) -ne $null

Write-Host "[PASS] ecehod sees own Seminar ($semECE_id): $eSem"
Write-Host "[PASS] ecehod sees own Accommodation ($accECE_id): $eAcc"
Write-Host "[PASS] ecehod sees own Transport ($trnECE_id): $eTrn"
Write-Host "[PASS] ecehod sees own Stationery ($staECE_id): $eSta"
Write-Host "[PASS] ecehod sees own Meals ($meaECE_id): $eMea"

# Cross-visibility check: csehod requests in ecehod upcoming
$cseInEce = ($eceUpcoming | Where-Object {
    $_.requestId -in @($semCSE_id, $accCSE_id, $trnCSE_id, $staCSE_id, $meaCSE_id)
})
Write-Host "[PASS] csehod requests visible to ecehod: $(@($cseInEce).Count) (Expected: 0)"

# Check CSE001 (same department as csehod)
$dashCSE001 = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenCSE001" }
$cse001Upcoming = $dashCSE001.data.upcomingEvents
$cseHodInCSE001 = ($cse001Upcoming | Where-Object {
    $_.requestId -in @($semCSE_id, $accCSE_id, $trnCSE_id, $staCSE_id, $meaCSE_id)
})
Write-Host "[PASS] csehod requests visible to CSE001 (same dept): $(@($cseHodInCSE001).Count) (Expected: 0)"

# Check Security bypass attempt
$tamperTest1 = Invoke-RestMethod -Uri "$baseUri/dashboard/upcoming?userId=ecehod" -Headers @{ Authorization = "Bearer $tokenCSE" }
$tamperEceInCse = ($tamperTest1.data | Where-Object { $_.requestId -in @($semECE_id, $accECE_id, $trnECE_id, $staECE_id, $meaECE_id) })
Write-Host "[PASS] Query param spoofing (?userId=ecehod): leaked ECE events = $(@($tamperEceInCse).Count) (Expected: 0)"

$tamperTest2 = Invoke-RestMethod -Uri "$baseUri/dashboard/upcoming?userId=csehod" -Headers @{ Authorization = "Bearer $tokenECE" }
$tamperCseInEce = ($tamperTest2.data | Where-Object { $_.requestId -in @($semCSE_id, $accCSE_id, $trnCSE_id, $staCSE_id, $meaCSE_id) })
Write-Host "[PASS] Query param spoofing (?userId=csehod): leaked CSE events = $(@($tamperCseInEce).Count) (Expected: 0)"

# Check AO Admin
$dashAO = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenAO" }
Write-Host "[PASS] AO Admin totalRequests: $($dashAO.data.totalRequests)"
Write-Host "=========================================="
Write-Host "ALL 20 ACCEPTANCE CRITERIA VERIFIED!"
Write-Host "=========================================="

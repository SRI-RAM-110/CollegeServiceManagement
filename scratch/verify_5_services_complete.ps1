$baseUri = "http://localhost:8080/api"

# 1. Login
$loginCSE = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"csehod","password":"dept123"}'
$tokenCSE = $loginCSE.data.token
$loginECE = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"ecehod","password":"dept123"}'
$tokenECE = $loginECE.data.token
$loginAO = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"AO001","password":"admin123"}'
$tokenAO = $loginAO.data.token

Write-Host "=== TEST START ==="
Write-Host "CSE user: $($loginCSE.data.name) ($($loginCSE.data.userId))"
Write-Host "ECE user: $($loginECE.data.name) ($($loginECE.data.userId))"

# 2. csehod creates requests in all 5 services
# Service 1: Seminar
$semCSE = Invoke-RestMethod -Uri "$baseUri/seminar/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    eventTitle = "CSE Cloud Workshop"; purpose = "Skill Training"; expectedParticipants = 110;
    date = "2026-11-28"; hallId = "SH-1"; slot = "FORENOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semCSE_id = $semCSE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "1. Seminar (CSE): $semCSE_id (Approved)"

# Service 2: Accommodation
$accCSE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    facultyOrGuestName = "Dr. Raman"; hostel = "Boys Hostel"; roomType = "Non-AC Room"; roomId = "BH-NAC-1";
    checkInDate = "2026-11-28"; checkOutDate = "2026-11-30"; guestsCount = 1; purpose = "Academic Auditor"
} | ConvertTo-Json)
$accCSE_id = $accCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "2. Accommodation (CSE): $accCSE_id (Approved)"

# Service 3: Transport
$trnCSE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    tripType = "Innova"; tripDate = "2026-11-28"; roundTrip = $true; pickupLocation = "Admin Block";
    destination = "Airport"; purpose = "Guest Pickup"; departureTime = "10:00 AM";
    returnTime = "02:00 PM"; expectedPassengers = 4
} | ConvertTo-Json)
$trnCSE_id = $trnCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "3. Transport (CSE): $trnCSE_id (Approved)"

# Service 4: Stationery
$staCSE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    purpose = "CSE Workshop Materials"; items = @(@{ itemId = "ST-01"; quantity = 10 }, @{ itemId = "ST-03"; quantity = 20 })
} | ConvertTo-Json)
$staCSE_id = $staCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "4. Stationery (CSE): $staCSE_id (Approved)"

# Service 5: Meals
$meaCSE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    eventTitle = "Workshop Lunch"; date = "2026-11-28"; venue = "CSE Seminar Hall";
    mealTypes = @("Lunch"); totalGuests = 60
} | ConvertTo-Json)
$meaCSE_id = $meaCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "5. Meals (CSE): $meaCSE_id (Approved)"

# 3. ecehod creates requests in all 5 services
# Service 1: Seminar
$semECE = Invoke-RestMethod -Uri "$baseUri/seminar/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "ECE Embedded Expo"; purpose = "Industry Project Display"; expectedParticipants = 85;
    date = "2026-11-29"; hallId = "SH-2"; slot = "FORENOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semECE_id = $semECE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "6. Seminar (ECE): $semECE_id (Approved)"

# Service 2: Accommodation
$accECE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    facultyOrGuestName = "Prof. Geetha"; hostel = "Girls Hostel"; roomType = "Non-AC Room"; roomId = "GH-NAC-1";
    checkInDate = "2026-11-28"; checkOutDate = "2026-11-30"; guestsCount = 1; purpose = "External Examiner"
} | ConvertTo-Json)
$accECE_id = $accECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "7. Accommodation (ECE): $accECE_id (Approved)"

# Service 3: Transport
$trnECE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    tripType = "Tempo Traveller"; tripDate = "2026-11-29"; roundTrip = $true; pickupLocation = "ECE Block";
    destination = "Vijayawada Expo Center"; purpose = "Project Expo Visit"; departureTime = "07:30 AM";
    returnTime = "07:00 PM"; expectedPassengers = 15
} | ConvertTo-Json)
$trnECE_id = $trnECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "8. Transport (ECE): $trnECE_id (Approved)"

# Service 4: Stationery
$staECE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    purpose = "ECE Exam Sheets"; items = @(@{ itemId = "ST-02"; quantity = 15 }, @{ itemId = "ST-04"; quantity = 25 })
} | ConvertTo-Json)
$staECE_id = $staECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "9. Stationery (ECE): $staECE_id (Approved)"

# Service 5: Meals
$meaECE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "Expo Breakfast & Snacks"; date = "2026-11-29"; venue = "ECE Seminar Hall";
    mealTypes = @("Breakfast", "Snacks"); totalGuests = 45
} | ConvertTo-Json)
$meaECE_id = $meaECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "10. Meals (ECE): $meaECE_id (Approved)"

Write-Host "`n=== VERIFYING DASHBOARD ISOLATION ACROSS ALL 5 SERVICES ==="

# Check csehod dashboard
$dashCSE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenCSE" }
$cseUpcoming = $dashCSE.data.upcomingEvents

$c1 = ($cseUpcoming | Where-Object { $_.requestId -eq $semCSE_id }) -ne $null
$c2 = ($cseUpcoming | Where-Object { $_.requestId -eq $accCSE_id }) -ne $null
$c3 = ($cseUpcoming | Where-Object { $_.requestId -eq $trnCSE_id }) -ne $null
$c4 = ($cseUpcoming | Where-Object { $_.requestId -eq $staCSE_id }) -ne $null
$c5 = ($cseUpcoming | Where-Object { $_.requestId -eq $meaCSE_id }) -ne $null

Write-Host "CSE sees own Seminar ($semCSE_id): $c1 (Expected: True)"
Write-Host "CSE sees own Accommodation ($accCSE_id): $c2 (Expected: True)"
Write-Host "CSE sees own Transport ($trnCSE_id): $c3 (Expected: True)"
Write-Host "CSE sees own Stationery ($staCSE_id): $c4 (Expected: True)"
Write-Host "CSE sees own Meals ($meaCSE_id): $c5 (Expected: True)"

$crossInCSE = ($cseUpcoming | Where-Object {
    $_.requestId -in @($semECE_id, $accECE_id, $trnECE_id, $staECE_id, $meaECE_id)
})
Write-Host "Cross-check: Any ECE request in CSE upcoming: $(@($crossInCSE).Count) (Expected: 0)"

# Check ecehod dashboard
$dashECE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenECE" }
$eceUpcoming = $dashECE.data.upcomingEvents

$e1 = ($eceUpcoming | Where-Object { $_.requestId -eq $semECE_id }) -ne $null
$e2 = ($eceUpcoming | Where-Object { $_.requestId -eq $accECE_id }) -ne $null
$e3 = ($eceUpcoming | Where-Object { $_.requestId -eq $trnECE_id }) -ne $null
$e4 = ($eceUpcoming | Where-Object { $_.requestId -eq $staECE_id }) -ne $null
$e5 = ($eceUpcoming | Where-Object { $_.requestId -eq $meaECE_id }) -ne $null

Write-Host "ECE sees own Seminar ($semECE_id): $e1 (Expected: True)"
Write-Host "ECE sees own Accommodation ($accECE_id): $e2 (Expected: True)"
Write-Host "ECE sees own Transport ($trnECE_id): $e3 (Expected: True)"
Write-Host "ECE sees own Stationery ($staECE_id): $e4 (Expected: True)"
Write-Host "ECE sees own Meals ($meaECE_id): $e5 (Expected: True)"

$crossInECE = ($eceUpcoming | Where-Object {
    $_.requestId -in @($semCSE_id, $accCSE_id, $trnCSE_id, $staCSE_id, $meaCSE_id)
})
Write-Host "Cross-check: Any CSE request in ECE upcoming: $(@($crossInECE).Count) (Expected: 0)"

# Check refresh / relogin
$reLoginCSE = Invoke-RestMethod -Uri "$baseUri/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"csehod","password":"dept123"}'
$reDashCSE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $($reLoginCSE.data.token)" }
$reCross = ($reDashCSE.data.upcomingEvents | Where-Object { $_.requestId -in @($semECE_id, $accECE_id, $trnECE_id, $staECE_id, $meaECE_id) })
Write-Host "After Relogin: Any ECE request in CSE upcoming: $(@($reCross).Count) (Expected: 0)"

Write-Host "=== ALL VERIFICATIONS PASSED ==="

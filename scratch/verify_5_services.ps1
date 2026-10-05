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
    eventTitle = "CSE National Conference"; purpose = "Paper Presentations"; expectedParticipants = 120;
    date = "2026-11-10"; hallId = "SH-1"; slot = "AFTERNOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semCSE_id = $semCSE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "1. Seminar (CSE): $semCSE_id (Approved)"

# Service 2: Accommodation
$accCSE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    facultyOrGuestName = "Prof. Arvind"; hostel = "Boys Hostel"; roomType = "AC Room"; roomId = "BH-AC-1";
    checkInDate = "2026-11-12"; checkOutDate = "2026-11-14"; guestsCount = 1; purpose = "Keynote Speaker"
} | ConvertTo-Json)
$accCSE_id = $accCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "2. Accommodation (CSE): $accCSE_id (Approved)"

# Service 3: Transport
$trnCSE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    tripType = "College Bus"; tripDate = "2026-11-15"; roundTrip = $true; pickupLocation = "Campus Main Gate";
    destination = "Guntur Railway Station"; purpose = "Conference Delegates Pickup"; departureTime = "08:00 AM";
    returnTime = "06:00 PM"; expectedPassengers = 25
} | ConvertTo-Json)
$trnCSE_id = $trnCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "3. Transport (CSE): $trnCSE_id (Approved)"

# Service 4: Stationery
$staCSE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    purpose = "Conference Kits"; items = @(@{ itemId = "ITEM-001"; quantity = 50 })
} | ConvertTo-Json)
$staCSE_id = $staCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "4. Stationery (CSE): $staCSE_id (Approved)"

# Service 5: Meals
$meaCSE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenCSE" } -Body (@{
    eventTitle = "Conference Lunch & Hi-Tea"; date = "2026-11-10"; venue = "CSE Seminar Hall";
    mealTypes = @("Lunch", "Tea / Coffee"); totalGuests = 120
} | ConvertTo-Json)
$meaCSE_id = $meaCSE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaCSE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "5. Meals (CSE): $meaCSE_id (Approved)"

# 3. ecehod creates requests in all 5 services
# Service 1: Seminar
$semECE = Invoke-RestMethod -Uri "$baseUri/seminar/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "ECE Robotics Symposium"; purpose = "Student Exhibition"; expectedParticipants = 90;
    date = "2026-11-18"; hallId = "SH-4"; slot = "FORENOON"; bookingType = "ONE_TIME"
} | ConvertTo-Json)
$semECE_id = $semECE.data.bookingId
Invoke-RestMethod -Uri "$baseUri/seminar/requests/$semECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "6. Seminar (ECE): $semECE_id (Approved)"

# Service 2: Accommodation
$accECE = Invoke-RestMethod -Uri "$baseUri/accommodation/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    facultyOrGuestName = "Dr. Shreya"; hostel = "Girls Hostel"; roomType = "AC Room"; roomId = "GH-AC-1";
    checkInDate = "2026-11-20"; checkOutDate = "2026-11-22"; guestsCount = 1; purpose = "Guest Lecture"
} | ConvertTo-Json)
$accECE_id = $accECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/accommodation/requests/$accECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "7. Accommodation (ECE): $accECE_id (Approved)"

# Service 3: Transport
$trnECE = Invoke-RestMethod -Uri "$baseUri/transport/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    tripType = "Mini Bus"; tripDate = "2026-11-25"; roundTrip = $true; pickupLocation = "ECE Block";
    destination = "ISRO Sriharikota"; purpose = "Field Trip"; departureTime = "06:00 AM";
    returnTime = "09:00 PM"; expectedPassengers = 20
} | ConvertTo-Json)
$trnECE_id = $trnECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/transport/requests/$trnECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "8. Transport (ECE): $trnECE_id (Approved)"

# Service 4: Stationery
$staECE = Invoke-RestMethod -Uri "$baseUri/stationery/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    purpose = "ECE Lab Manuals"; items = @(@{ itemId = "ITEM-002"; quantity = 40 })
} | ConvertTo-Json)
$staECE_id = $staECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/stationery/requests/$staECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "9. Stationery (ECE): $staECE_id (Approved)"

# Service 5: Meals
$meaECE = Invoke-RestMethod -Uri "$baseUri/meals/requests" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $tokenECE" } -Body (@{
    eventTitle = "Robotics Team Dinner"; date = "2026-11-18"; venue = "ECE Seminar Hall";
    mealTypes = @("Dinner"); totalGuests = 50
} | ConvertTo-Json)
$meaECE_id = $meaECE.data.requestId
Invoke-RestMethod -Uri "$baseUri/meals/requests/$meaECE_id/approve" -Method PUT -Headers @{ Authorization = "Bearer $tokenAO" } | Out-Null
Write-Host "10. Meals (ECE): $meaECE_id (Approved)"

Write-Host "`n=== VERIFYING DASHBOARD ISOLATION ==="

# Check csehod dashboard
$dashCSE = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenCSE" }
$cseUpcoming = $dashCSE.data.upcomingEvents

$c1 = ($cseUpcoming | Where-Object { $_.requestId -eq $semCSE_id }) -ne $null
$c2 = ($cseUpcoming | Where-Object { $_.requestId -eq $accCSE_id }) -ne $null
$c3 = ($cseUpcoming | Where-Object { $_.requestId -eq $trnCSE_id }) -ne $null
$c4 = ($cseUpcoming | Where-Object { $_.requestId -eq $staCSE_id }) -ne $null
$c5 = ($cseUpcoming | Where-Object { $_.requestId -eq $meaCSE_id }) -ne $null

Write-Host "CSE sees own Seminar: $c1 (Expected: True)"
Write-Host "CSE sees own Accommodation: $c2 (Expected: True)"
Write-Host "CSE sees own Transport: $c3 (Expected: True)"
Write-Host "CSE sees own Stationery: $c4 (Expected: True)"
Write-Host "CSE sees own Meals: $c5 (Expected: True)"

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

Write-Host "ECE sees own Seminar: $e1 (Expected: True)"
Write-Host "ECE sees own Accommodation: $e2 (Expected: True)"
Write-Host "ECE sees own Transport: $e3 (Expected: True)"
Write-Host "ECE sees own Stationery: $e4 (Expected: True)"
Write-Host "ECE sees own Meals: $e5 (Expected: True)"

$crossInECE = ($eceUpcoming | Where-Object {
    $_.requestId -in @($semCSE_id, $accCSE_id, $trnCSE_id, $staCSE_id, $meaCSE_id)
})
Write-Host "Cross-check: Any CSE request in ECE upcoming: $(@($crossInECE).Count) (Expected: 0)"

# Check AO Admin
$dashAO = Invoke-RestMethod -Uri "$baseUri/dashboard" -Headers @{ Authorization = "Bearer $tokenAO" }
Write-Host "AO Admin total requests: $($dashAO.data.totalRequests)"
Write-Host "=== TEST COMPLETE ==="

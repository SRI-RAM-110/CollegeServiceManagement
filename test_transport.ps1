$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"CSE001","password":"dept123"}'
$token = $login.data.token
$trips = Invoke-RestMethod -Uri "http://localhost:8080/api/transport/trips?date=2026-09-25" -Headers @{ Authorization = "Bearer $token" }
Write-Host "Trips on 2026-09-25 (count: $($trips.data.Count)):"
foreach ($t in $trips.data) {
  Write-Host "  $($t.departureTime) | $($t.destination) | $($t.department) | $($t.vehicleName) | $($t.status)"
}
$vehicles = Invoke-RestMethod -Uri "http://localhost:8080/api/transport/vehicles?date=2026-09-25" -Headers @{ Authorization = "Bearer $token" }
Write-Host "Vehicles on 2026-09-25:"
foreach ($v in $vehicles.data) {
  Write-Host "  $($v.name) : $($v.status)"
}

package com.nec.collegeservices.service;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Database Seeder for Dynamic Resource Management.
 * 
 * Safety Rule:
 * Only populates default records when a collection is completely empty (count == 0).
 * Never overwrites or modifies existing database records on application restart.
 */
@Component
@Slf4j
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private SeminarHallRepository hallRepository;

    @Autowired
    private AccommodationRoomRepository roomRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private StationeryItemRepository itemRepository;

    private static final String SYSTEM_ACTOR = "SYSTEM_SEEDER";

    @Override
    public void run(String... args) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        seedHallsIfEmpty(now);
        seedRoomsIfEmpty(now);
        seedVehiclesIfEmpty(now);
        seedStationeryIfEmpty(now);
    }

    public void seedHallsIfEmpty(String now) {
        long count = hallRepository.count();
        if (count == 0) {
            log.info("Seminar halls collection is empty. Seeding default halls...");
            List<SeminarHall> defaults = List.of(
                SeminarHall.builder()
                    .hallId("SH-1")
                    .name("Seminar Hall 1")
                    .location("Block 3 – Ground Floor")
                    .block("Block 3")
                    .floor("Ground Floor")
                    .capacity(120)
                    .facilities(List.of("Projector", "AC", "Audio System", "Wi-Fi"))
                    .status("Available")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                SeminarHall.builder()
                    .hallId("SH-2")
                    .name("Seminar Hall 2")
                    .location("Block 3 – First Floor")
                    .block("Block 3")
                    .floor("First Floor")
                    .capacity(150)
                    .facilities(List.of("Projector", "AC", "Audio System", "Wi-Fi"))
                    .status("Available")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                SeminarHall.builder()
                    .hallId("SH-3")
                    .name("Seminar Hall 3")
                    .location("Block 4 – Ground Floor")
                    .block("Block 4")
                    .floor("Ground Floor")
                    .capacity(350)
                    .facilities(List.of("Projector", "AC", "Audio System", "Wi-Fi"))
                    .status("Available")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                SeminarHall.builder()
                    .hallId("SH-4")
                    .name("Seminar Hall 4")
                    .location("Pharma Block – Ground Floor")
                    .block("Pharma Block")
                    .floor("Ground Floor")
                    .capacity(200)
                    .facilities(List.of("Projector", "AC", "Audio System", "Wi-Fi"))
                    .status("Available")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                SeminarHall.builder()
                    .hallId("SH-5")
                    .name("Tech Hub")
                    .location("Block 3 – Third Floor")
                    .block("Block 3")
                    .floor("Third Floor")
                    .capacity(150)
                    .facilities(List.of("Projector", "AC", "Audio System", "Wi-Fi", "Video Conferencing"))
                    .status("Available")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build()
            );
            hallRepository.saveAll(defaults);
            log.info("Successfully seeded {} default seminar halls.", defaults.size());
        } else {
            log.info("Seminar halls collection already contains {} records. Skipping default seeding.", count);
        }
    }

    public void seedRoomsIfEmpty(String now) {
        long count = roomRepository.count();
        if (count == 0) {
            log.info("Accommodation rooms collection is empty. Seeding default rooms...");
            List<AccommodationRoom> defaults = List.of(
                AccommodationRoom.builder()
                    .roomId("GH-AC-1")
                    .hostel("Girls Hostel")
                    .roomType("AC Room")
                    .capacity(2)
                    .amenities(List.of("AC", "Attached Bath", "Wi-Fi", "TV"))
                    .location("Girls Hostel - Block A, Ground Floor")
                    .status("Available")
                    .available(true)
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                AccommodationRoom.builder()
                    .roomId("GH-NAC-1")
                    .hostel("Girls Hostel")
                    .roomType("Non-AC Room")
                    .capacity(2)
                    .amenities(List.of("Attached Bath", "Wi-Fi"))
                    .location("Girls Hostel - Block A, First Floor")
                    .status("Available")
                    .available(true)
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                AccommodationRoom.builder()
                    .roomId("BH-AC-1")
                    .hostel("Boys Hostel")
                    .roomType("AC Room")
                    .capacity(2)
                    .amenities(List.of("AC", "Attached Bath", "Wi-Fi", "TV"))
                    .location("Boys Hostel - Block B, Ground Floor")
                    .status("Available")
                    .available(true)
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                AccommodationRoom.builder()
                    .roomId("BH-NAC-1")
                    .hostel("Boys Hostel")
                    .roomType("Non-AC Room")
                    .capacity(2)
                    .amenities(List.of("Attached Bath", "Wi-Fi"))
                    .location("Boys Hostel - Block B, First Floor")
                    .status("Available")
                    .available(true)
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                AccommodationRoom.builder()
                    .roomId("GH-VIP-1")
                    .hostel("Guest House")
                    .roomType("AC Room")
                    .capacity(2)
                    .amenities(List.of("AC", "Attached Bath", "Wi-Fi", "TV", "Geyser", "Fridge"))
                    .location("Main Guest House - Ground Floor")
                    .status("Available")
                    .available(true)
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build()
            );
            roomRepository.saveAll(defaults);
            log.info("Successfully seeded {} default accommodation rooms.", defaults.size());
        } else {
            log.info("Accommodation rooms collection already contains {} records. Skipping default seeding.", count);
        }
    }

    public void seedVehiclesIfEmpty(String now) {
        long count = vehicleRepository.count();
        if (count == 0) {
            log.info("Vehicles collection is empty. Seeding default fleet...");
            List<Vehicle> defaults = List.of(
                Vehicle.builder()
                    .vehicleId("V-01")
                    .name("College Bus 1 (50 Seater)")
                    .type("College Bus")
                    .registrationNumber("AP39 AB 1234")
                    .capacity(50)
                    .status("AVAILABLE")
                    .driverName("R. Prasad")
                    .driverPhone("9876543210")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                Vehicle.builder()
                    .vehicleId("V-02")
                    .name("College Bus 2 (40 Seater)")
                    .type("College Bus")
                    .registrationNumber("AP39 AB 5678")
                    .capacity(40)
                    .status("AVAILABLE")
                    .driverName("K. Venkatesh")
                    .driverPhone("9876543211")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                Vehicle.builder()
                    .vehicleId("V-03")
                    .name("Mini Bus (25 Seater)")
                    .type("Mini Bus")
                    .registrationNumber("AP39 AB 9012")
                    .capacity(25)
                    .status("AVAILABLE")
                    .driverName("S. Ramesh")
                    .driverPhone("9876543212")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                Vehicle.builder()
                    .vehicleId("V-04")
                    .name("Tempo Traveller (17 Seater)")
                    .type("Tempo Traveller")
                    .registrationNumber("AP39 AB 3456")
                    .capacity(17)
                    .status("AVAILABLE")
                    .driverName("M. Nagaraju")
                    .driverPhone("9876543213")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                Vehicle.builder()
                    .vehicleId("V-05")
                    .name("Innova Crysta (7 Seater)")
                    .type("Innova")
                    .registrationNumber("AP39 AB 7890")
                    .capacity(7)
                    .status("AVAILABLE")
                    .driverName("Ch. Suresh")
                    .driverPhone("9876543214")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build()
            );
            vehicleRepository.saveAll(defaults);
            log.info("Successfully seeded {} default vehicles.", defaults.size());
        } else {
            log.info("Vehicles collection already contains {} records. Skipping default seeding.", count);
        }
    }

    public void seedStationeryIfEmpty(String now) {
        long count = itemRepository.count();
        if (count == 0) {
            log.info("Stationery catalog is empty. Seeding default requisition items...");
            List<StationeryItem> defaults = List.of(
                StationeryItem.builder()
                    .itemId("ST-01")
                    .name("A4 Paper Bundle (500 sheets)")
                    .category("Paper")
                    .description("75 GSM executive white printing paper")
                    .unit("packs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-02")
                    .name("Whiteboard Marker Set (4 colors)")
                    .category("Writing")
                    .description("Non-toxic whiteboard markers (Black, Blue, Red, Green)")
                    .unit("packs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-03")
                    .name("Permanent Marker (Black/Blue)")
                    .category("Writing")
                    .description("Waterproof bullet tip permanent marker")
                    .unit("pcs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-04")
                    .name("Box File with Clip")
                    .category("Filing")
                    .description("Heavy-duty cardboard lever arch box file")
                    .unit("pcs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-05")
                    .name("Stapler (Medium) with Pins")
                    .category("Office Tools")
                    .description("Standard desk stapler with 1000 staples box")
                    .unit("pcs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-06")
                    .name("Sticky Notes (Yellow 3x3)")
                    .category("Paper")
                    .description("Self-adhesive 100-sheet notepad")
                    .unit("packs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-07")
                    .name("Spiral Notepad (Executive)")
                    .category("Paper")
                    .description("Single-ruled 160 pages conference notepad")
                    .unit("pcs")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build(),
                StationeryItem.builder()
                    .itemId("ST-08")
                    .name("Ballpoint Pen Set (Blue/Black)")
                    .category("Writing")
                    .description("Smooth writing 0.7mm ballpoint pens (Pack of 10)")
                    .unit("boxes")
                    .active(true)
                    .createdAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .build()
            );
            itemRepository.saveAll(defaults);
            log.info("Successfully seeded {} default stationery items (request-only catalog).", defaults.size());
        } else {
            log.info("Stationery catalog already contains {} records. Skipping default seeding.", count);
        }
    }
}


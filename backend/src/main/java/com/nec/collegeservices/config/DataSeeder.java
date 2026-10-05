package com.nec.collegeservices.config;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private SeminarHallRepository seminarHallRepository;

    @Autowired
    private AccommodationRoomRepository accommodationRoomRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private StationeryItemRepository stationeryItemRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedDepartments();
        seedSeminarHalls();
        seedAccommodationRooms();
        seedVehicles();
        seedStationeryItems();
        seedAnnouncements();
        logger.info("NEC College Faculty Service Management System data seeding completed!");
    }

    private void seedUsers() {
        seedCreatorUser();

        String deptPass = passwordEncoder.encode("dept123");
        String adminPass = passwordEncoder.encode("admin123");
        String coordPass = passwordEncoder.encode("coord123");

        // 1. Primary AO Administrator (Exactly ONE)
        seedOrUpdateUser("AO001", adminPass, "AO Administrator", "AO_ADMIN", List.of("AO_ADMIN"), "ADMIN", "ao001@nrtec.local", "+91 90000 00000", List.of());

        // 2. Department Users (ONE per supported canonical department)
        seedOrUpdateUser("CSE001", deptPass, "CSE Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "CSE", "cse001@nrtec.local", "+91 90000 00001", List.of());
        seedOrUpdateUser("ECE001", deptPass, "ECE Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "ECE", "ece001@nrtec.local", "+91 90000 00002", List.of());
        seedOrUpdateUser("EEE001", deptPass, "EEE Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "EEE", "eee001@nrtec.local", "+91 90000 00003", List.of());
        seedOrUpdateUser("ME001", deptPass, "Mechanical Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "ME", "me001@nrtec.local", "+91 90000 00004", List.of());
        seedOrUpdateUser("CIVIL001", deptPass, "Civil Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "CIVIL", "civil001@nrtec.local", "+91 90000 00005", List.of());
        seedOrUpdateUser("AI001", deptPass, "AI Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "AI", "ai001@nrtec.local", "+91 90000 00006", List.of());
        seedOrUpdateUser("MBA001", deptPass, "MBA Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "MBA", "mba001@nrtec.local", "+91 90000 00007", List.of());
        seedOrUpdateUser("PHARM001", deptPass, "Pharmacy Department User", "DEPARTMENT_USER", List.of("DEPARTMENT_USER"), "PHARM", "pharm001@nrtec.local", "+91 90000 00008", List.of());

        // 3. Generic Department HODs (ONE per supported canonical department)
        seedOrUpdateUser("csehod", deptPass, "CSE HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "CSE", "csehod@nrtec.local", "+91 90000 00011", List.of());
        seedOrUpdateUser("ecehod", deptPass, "ECE HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "ECE", "ecehod@nrtec.local", "+91 90000 00012", List.of());
        seedOrUpdateUser("eeehod", deptPass, "EEE HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "EEE", "eeehod@nrtec.local", "+91 90000 00013", List.of());
        seedOrUpdateUser("mechhod", deptPass, "Mechanical HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "ME", "mechhod@nrtec.local", "+91 90000 00014", List.of());
        seedOrUpdateUser("civilhod", deptPass, "Civil HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "CIVIL", "civilhod@nrtec.local", "+91 90000 00015", List.of());
        seedOrUpdateUser("aihod", deptPass, "AI HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "AI", "aihod@nrtec.local", "+91 90000 00016", List.of());
        seedOrUpdateUser("mbahod", deptPass, "MBA HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "MBA", "mbahod@nrtec.local", "+91 90000 00017", List.of());
        seedOrUpdateUser("pharmhod", deptPass, "Pharmacy HOD", "DEPARTMENT_HOD", List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"), "PHARM", "pharmhod@nrtec.local", "+91 90000 00018", List.of());

        // 4. Service Administrators (Exactly ONE per service)
        seedOrUpdateUser("SEM001", adminPass, "Seminar Administrator", "SEMINAR_ADMIN", List.of("SEMINAR_ADMIN"), "SEMINAR", "sem001@nrtec.local", "+91 90000 00021", List.of());
        seedOrUpdateUser("ACC001", adminPass, "Accommodation Administrator", "ACCOMMODATION_ADMIN", List.of("ACCOMMODATION_ADMIN"), "HOSTEL", "acc001@nrtec.local", "+91 90000 00022", List.of());
        seedOrUpdateUser("TRN001", adminPass, "Transport Administrator", "TRANSPORT_ADMIN", List.of("TRANSPORT_ADMIN"), "TRANSPORT", "trn001@nrtec.local", "+91 90000 00023", List.of());
        seedOrUpdateUser("STA001", adminPass, "Stationery Administrator", "STATIONERY_ADMIN", List.of("STATIONERY_ADMIN"), "STORE", "sta001@nrtec.local", "+91 90000 00024", List.of());
        seedOrUpdateUser("MEA001", adminPass, "Meals Administrator", "MEALS_ADMIN", List.of("MEALS_ADMIN"), "CANTEEN", "mea001@nrtec.local", "+91 90000 00025", List.of());

        // 5. Hall-Specific Seminar Coordinators (Clean single-role SEMINAR_COORDINATOR)
        seedOrUpdateUser("seminarcoordinator1", coordPass, "Seminar Coordinator 1", "SEMINAR_COORDINATOR",
                List.of("SEMINAR_COORDINATOR"), "CSE", "seminarcoordinator1@nrtec.local", "+91 90000 00031", List.of("SH-1"));

        seedOrUpdateUser("seminarcoordinator2", coordPass, "Seminar Coordinator 2", "SEMINAR_COORDINATOR",
                List.of("SEMINAR_COORDINATOR"), "ECE", "seminarcoordinator2@nrtec.local", "+91 90000 00032", List.of("SH-2"));

        seedOrUpdateUser("seminarcoordinator3", coordPass, "Seminar Coordinator 3", "SEMINAR_COORDINATOR",
                List.of("SEMINAR_COORDINATOR"), "ME", "seminarcoordinator3@nrtec.local", "+91 90000 00033", List.of("SH-3"));

        seedOrUpdateUser("seminarcoordinator4", coordPass, "Seminar Coordinator 4", "SEMINAR_COORDINATOR",
                List.of("SEMINAR_COORDINATOR"), "PHARM", "seminarcoordinator4@nrtec.local", "+91 90000 00034", List.of("SH-4"));

        seedOrUpdateUser("seminarcoordinator5", coordPass, "Seminar Coordinator 5", "SEMINAR_COORDINATOR",
                List.of("SEMINAR_COORDINATOR"), "AI", "seminarcoordinator5@nrtec.local", "+91 90000 00035", List.of("SH-5"));

        // 6. Cleanup obsolete accounts if present
        userRepository.findByUserId("ithod").ifPresent(user -> {
            userRepository.delete(user);
            logger.info("Cleaned up obsolete user account: ithod");
        });
        userRepository.findByUserId("cseaihod").ifPresent(user -> {
            userRepository.delete(user);
            logger.info("Cleaned up obsolete user account: cseaihod");
        });
    }

    private void seedCreatorUser() {
        userRepository.findByUserId("CREATOR001").ifPresentOrElse(user -> {
            boolean updated = false;
            if (!"CREATOR".equalsIgnoreCase(user.getRole())) {
                user.setRole("CREATOR");
                updated = true;
            }
            if (user.getRoles() == null || !user.getRoles().contains("CREATOR")) {
                user.setRoles(List.of("CREATOR"));
                updated = true;
            }
            if (user.getActive() == null || !user.getActive()) {
                user.setActive(true);
                updated = true;
            }
            if (user.getDepartment() == null || user.getDepartment().isBlank()) {
                user.setDepartment("ADMIN");
                updated = true;
            }
            if (updated) {
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
                logger.info("CREATOR001 verified and updated with CREATOR role.");
            }
        }, () -> {
            String rawPass = System.getenv("CREATOR_PASSWORD");
            if (rawPass == null || rawPass.isBlank()) {
                rawPass = System.getProperty("creator.password");
            }
            if (rawPass == null || rawPass.isBlank()) {
                java.io.File secretFile = new java.io.File(System.getProperty("user.home"), ".collegeservices_creator_secret");
                if (secretFile.exists()) {
                    try {
                        rawPass = java.nio.file.Files.readString(secretFile.toPath()).trim();
                    } catch (Exception ignored) {}
                }
            }
            if (rawPass == null || rawPass.isBlank()) {
                java.security.SecureRandom sr = new java.security.SecureRandom();
                byte[] bytes = new byte[16];
                sr.nextBytes(bytes);
                rawPass = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            }

            User creator = User.builder()
                    .userId("CREATOR001")
                    .name("System Creator")
                    .email("creator@nrtec.in")
                    .role("CREATOR")
                    .roles(List.of("CREATOR"))
                    .department("ADMIN")
                    .designation("System Creator")
                    .password(passwordEncoder.encode(rawPass))
                    .active(true)
                    .mustChangePassword(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            userRepository.save(creator);
            logger.info("CREATOR001 initialized successfully.");
        });
    }

    private void seedOrUpdateUser(String userId, String password, String name, String primaryRole, List<String> roles,
                                  String department, String email, String phone, List<String> assignedHallIds) {
        userRepository.findByUserId(userId).ifPresentOrElse(user -> {
            user.setName(name);
            user.setPassword(password);
            user.setRoles(roles);
            user.setRole(primaryRole);
            user.setDepartment(department);
            user.setEmail(email);
            user.setPhone(phone);
            user.setAssignedHallIds(assignedHallIds);
            user.setActive(true);
            userRepository.save(user);
        }, () -> {
            userRepository.save(User.builder()
                    .userId(userId)
                    .password(password)
                    .name(name)
                    .role(primaryRole)
                    .roles(roles)
                    .assignedHallIds(assignedHallIds)
                    .department(department)
                    .email(email)
                    .phone(phone)
                    .active(true)
                    .createdAt(LocalDateTime.now())
                    .build());
        });
    }

    private void seedDepartments() {
        seedOrUpdateDepartment("CSE", "Computer Science and Engineering", "Block 3", "Second Floor", "CSE HOD");
        seedOrUpdateDepartment("ECE", "Electronics and Communication Engineering", "Block 2", "First Floor", "ECE HOD");
        seedOrUpdateDepartment("EEE", "Electrical and Electronics Engineering", "Block 1", "Ground Floor", "EEE HOD");
        seedOrUpdateDepartment("ME", "Mechanical Engineering", "Block 4", "Ground Floor", "Mechanical HOD");
        seedOrUpdateDepartment("CIVIL", "Civil Engineering", "Block 4", "First Floor", "Civil HOD");
        seedOrUpdateDepartment("AI", "Artificial Intelligence and Data Science", "Block 3", "Third Floor", "AI HOD");
        seedOrUpdateDepartment("MBA", "Master of Business Administration", "MBA Block", "Ground Floor", "MBA HOD");
        seedOrUpdateDepartment("PHARM", "Pharmacy", "Pharma Block", "Ground Floor", "Pharmacy HOD");
    }

    private void seedOrUpdateDepartment(String code, String name, String block, String floor, String headOfDept) {
        departmentRepository.findByCode(code).ifPresentOrElse(dept -> {
            dept.setName(name);
            dept.setBlock(block);
            dept.setFloor(floor);
            dept.setHeadOfDept(headOfDept);
            dept.setActive(true);
            departmentRepository.save(dept);
        }, () -> {
            departmentRepository.save(Department.builder()
                    .code(code)
                    .name(name)
                    .block(block)
                    .floor(floor)
                    .headOfDept(headOfDept)
                    .active(true)
                    .build());
        });
    }

    private void seedSeminarHalls() {
        seedOrUpdateHall("SH-1", "Seminar Hall 1", "Block 3 – Ground Floor", "Block 3", "Ground Floor",
                300, List.of("Projector", "AC", "Audio System", "Wi-Fi"), "/assets/halls/hall1.jpg", "Available", List.of("seminarcoordinator1"));

        seedOrUpdateHall("SH-2", "Seminar Hall 2", "Block 3 – Third Floor", "Block 3", "Third Floor",
                200, List.of("Projector", "AC", "Audio System", "Wi-Fi"), "/assets/halls/hall2.jpg", "Available", List.of("seminarcoordinator2"));

        seedOrUpdateHall("SH-3", "Seminar Hall 3", "Block 4 – Ground Floor", "Block 4", "Ground Floor",
                350, List.of("Projector", "AC", "Audio System", "Wi-Fi"), "/assets/halls/hall3.jpg", "Available", List.of("seminarcoordinator3"));

        seedOrUpdateHall("SH-4", "Seminar Hall 4", "Pharma Block – Ground Floor", "Pharma Block", "Ground Floor",
                200, List.of("Projector", "AC", "Audio System", "Wi-Fi"), "/assets/halls/hall4.jpg", "Available", List.of("seminarcoordinator4"));

        seedOrUpdateHall("SH-5", "Tech Hub", "Block 3 – Third Floor", "Block 3", "Third Floor",
                150, List.of("Projector", "AC", "Audio System", "Wi-Fi"), "/assets/halls/techhub.jpg", "Available", List.of("seminarcoordinator5"));

        // If legacy TECH-HUB exists as a separate document, update it as well
        seminarHallRepository.findByHallId("TECH-HUB").ifPresent(th -> {
            th.setName("Tech Hub");
            th.setLocation("Block 3 – Third Floor");
            th.setCapacity(150);
            th.setFacilities(List.of("Projector", "AC", "Audio System", "Wi-Fi"));
            th.setStatus("Available");
            th.setCoordinatorUserIds(List.of("seminarcoordinator5"));
            seminarHallRepository.save(th);
        });
    }

    private void seedOrUpdateHall(String hallId, String name, String location, String block, String floor,
                                  int capacity, List<String> facilities, String image, String status, List<String> coordinators) {
        seminarHallRepository.findByHallId(hallId).ifPresentOrElse(h -> {
            h.setName(name);
            h.setLocation(location);
            h.setBlock(block);
            h.setFloor(floor);
            h.setCapacity(capacity);
            h.setFacilities(facilities);
            if (h.getStatus() == null) h.setStatus(status);
            h.setCoordinatorUserIds(coordinators);
            seminarHallRepository.save(h);
        }, () -> {
            seminarHallRepository.save(SeminarHall.builder()
                    .hallId(hallId)
                    .name(name)
                    .location(location)
                    .block(block)
                    .floor(floor)
                    .capacity(capacity)
                    .facilities(facilities)
                    .image(image)
                    .status(status)
                    .coordinatorUserIds(coordinators)
                    .build());
        });
    }

    private void seedAccommodationRooms() {
        seedOrUpdateRoom("GH-AC-1", "Girls Hostel", "AC Room", 2, List.of("AC", "Attached Bath", "Wi-Fi", "TV"),
                "/assets/rooms/room_ac.jpg", "Girls Hostel - Block A, Ground Floor");
        seedOrUpdateRoom("GH-NAC-1", "Girls Hostel", "Non-AC Room", 2, List.of("Attached Bath", "Wi-Fi"),
                "/assets/rooms/room_non_ac.jpg", "Girls Hostel - Block A, First Floor");
        seedOrUpdateRoom("BH-AC-1", "Boys Hostel", "AC Room", 2, List.of("AC", "Attached Bath", "Wi-Fi", "TV"),
                "/assets/rooms/room_ac.jpg", "Boys Hostel - Block B, Ground Floor");
        seedOrUpdateRoom("BH-NAC-1", "Boys Hostel", "Non-AC Room", 2, List.of("Attached Bath", "Wi-Fi"),
                "/assets/rooms/room_non_ac.jpg", "Boys Hostel - Block B, First Floor");
    }

    private void seedOrUpdateRoom(String roomId, String hostel, String roomType, int capacity, List<String> amenities, String image, String location) {
        accommodationRoomRepository.findByRoomId(roomId).ifPresentOrElse(r -> {
            r.setHostel(hostel);
            r.setRoomType(roomType);
            r.setCapacity(capacity);
            r.setAmenities(amenities);
            r.setImage(image);
            r.setLocation(location);
            if (r.getStatus() == null || r.getStatus().isBlank()) {
                r.setStatus("Available");
                r.setAvailable(true);
            }
            accommodationRoomRepository.save(r);
        }, () -> {
            accommodationRoomRepository.save(AccommodationRoom.builder()
                    .roomId(roomId)
                    .hostel(hostel)
                    .roomType(roomType)
                    .capacity(capacity)
                    .amenities(amenities)
                    .available(true)
                    .status("Available")
                    .currentOccupancy(0)
                    .image(image)
                    .location(location)
                    .build());
        });
    }

    private void seedVehicles() {
        if (vehicleRepository.count() > 0) return;

        vehicleRepository.save(Vehicle.builder()
                .vehicleId("V-01").name("College Bus 1 (50 Seater)").type("College Bus")
                .registrationNumber("AP39 AB 1234").capacity(50).status("AVAILABLE")
                .driverName("R. Prasad").driverPhone("+91 98481 12345").image("/assets/vehicles/bus1.jpg").build());

        vehicleRepository.save(Vehicle.builder()
                .vehicleId("V-02").name("College Bus 2 (40 Seater)").type("College Bus")
                .registrationNumber("AP39 AB 5678").capacity(40).status("AVAILABLE")
                .driverName("K. Srinivas").driverPhone("+91 98481 23456").image("/assets/vehicles/bus2.jpg").build());

        vehicleRepository.save(Vehicle.builder()
                .vehicleId("V-03").name("Mini Bus (25 Seater)").type("Mini Bus")
                .registrationNumber("AP39 AC 9012").capacity(25).status("AVAILABLE")
                .driverName("M. Venkatesh").driverPhone("+91 98481 34567").image("/assets/vehicles/minibus.jpg").build());

        vehicleRepository.save(Vehicle.builder()
                .vehicleId("V-04").name("Tempo Traveller (12 Seater)").type("Tempo Traveller")
                .registrationNumber("AP39 AC 3456").capacity(12).status("AVAILABLE")
                .driverName("S. Kumar").driverPhone("+91 98481 45678").image("/assets/vehicles/tempo.jpg").build());

        vehicleRepository.save(Vehicle.builder()
                .vehicleId("V-05").name("Innova (7 Seater)").type("Innova")
                .registrationNumber("AP39 AC 7890").capacity(7).status("AVAILABLE")
                .driverName("B. Nagesh").driverPhone("+91 98481 56789").image("/assets/vehicles/innova.jpg").build());
    }

    private void seedStationeryItems() {
        seedOrUpdateStationeryItem("ST-01", "A4 Paper (500 sheets)", "Paper", "packs", "Standard 75 GSM multipurpose white A4 copier paper", true, "/assets/stationery/a4.jpg");
        seedOrUpdateStationeryItem("ST-02", "A3 Paper (100 sheets)", "Paper", "packs", "Heavyweight 80 GSM white A3 sheets for drawings and charts", true, "/assets/stationery/a3.jpg");
        seedOrUpdateStationeryItem("ST-03", "Pens (Blue)", "Writing", "pcs", "Smooth flow 0.7mm blue ballpoint faculty pens", true, "/assets/stationery/pen_blue.jpg");
        seedOrUpdateStationeryItem("ST-04", "Pens (Black)", "Writing", "pcs", "Fine tip 0.7mm black archival ink pens", true, "/assets/stationery/pen_black.jpg");
        seedOrUpdateStationeryItem("ST-05", "Pencils", "Writing", "pcs", "HB bonded lead drawing and examination pencils", true, "/assets/stationery/pencils.jpg");
        seedOrUpdateStationeryItem("ST-06", "Markers", "Writing", "pcs", "Dry-erase whiteboard bullet tip markers", true, "/assets/stationery/markers.jpg");
        seedOrUpdateStationeryItem("ST-07", "Highlighters", "Writing", "pcs", "Fluorescent chisel-tip document highlighters", true, "/assets/stationery/highlighters.jpg");
        seedOrUpdateStationeryItem("ST-08", "Stapler", "Office Tools", "pcs", "Heavy-duty desktop 24/6 stapler", true, "/assets/stationery/stapler.jpg");
        seedOrUpdateStationeryItem("ST-09", "Staple Pins", "Office Tools", "boxes", "Standard No. 10 / 24/6 galvanized staple pin boxes", true, "/assets/stationery/pins.jpg");
        seedOrUpdateStationeryItem("ST-10", "Files & Folders", "Filing", "pcs", "Durable polypropylene ring binders and office document folders", true, "/assets/stationery/folders.jpg");
        seedOrUpdateStationeryItem("ST-11", "Chart Paper", "Paper", "sheets", "Assorted bright poster chart paper sheets for seminars", true, "/assets/stationery/chart.jpg");
        seedOrUpdateStationeryItem("ST-12", "Notebooks", "Paper", "pcs", "Hardcover ruled departmental records register notebooks", true, "/assets/stationery/notebook.jpg");
        seedOrUpdateStationeryItem("ST-13", "Envelopes", "Office Tools", "pcs", "Official institutional letterhead mailing envelopes", true, "/assets/stationery/envelope.jpg");
    }

    private void seedOrUpdateStationeryItem(String itemId, String name, String category, String unit, String description, boolean active, String image) {
        stationeryItemRepository.findByItemId(itemId).ifPresentOrElse(item -> {
            if (item.getDescription() == null || item.getDescription().isBlank()) {
                item.setDescription(description);
            }
            if (item.getName() == null || item.getName().isBlank()) {
                item.setName(name);
            }
            if (item.getCategory() == null || item.getCategory().isBlank()) {
                item.setCategory(category);
            }
            if (item.getUnit() == null || item.getUnit().isBlank()) {
                item.setUnit(unit);
            }
            if (item.getImage() == null || item.getImage().isBlank()) {
                item.setImage(image);
            }
            stationeryItemRepository.save(item);
        }, () -> {
            stationeryItemRepository.save(StationeryItem.builder()
                    .itemId(itemId)
                    .name(name)
                    .category(category)
                    .unit(unit)
                    .description(description)
                    .active(active)
                    .image(image)
                    .build());
        });
    }

    private void seedAnnouncements() {
        if (announcementRepository.count() > 0) return;

        announcementRepository.save(Announcement.builder()
                .title("College Foundation Day")
                .content("All departments are requested to plan their events and submit seminar/transport requirements.")
                .type("EVENT")
                .date("12 Sep 2026")
                .active(true).build());

        announcementRepository.save(Announcement.builder()
                .title("Maintenance Schedule")
                .content("Seminar Halls 2 & 4 will undergo AV system calibration on Sunday.")
                .type("MAINTENANCE")
                .date("10 Sep 2026")
                .active(true).build());
    }
}

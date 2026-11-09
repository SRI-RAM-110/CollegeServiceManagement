package com.nec.collegeservices.service;

import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.EmailLogRepository;
import com.nec.collegeservices.repository.NotificationRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalEmailRecipientResolutionTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    private User creator;
    private User aoAdmin;
    private User semAdmin;
    private User transAdmin;
    private User statAdmin;
    private User mealAdmin;
    private User cseHod;
    private User eceHod;
    private User cseUser;
    private User eceUser;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .userId("CREATOR001")
                .name("Creator User")
                .email("creator@nrtec.in")
                .role("CREATOR")
                .roles(List.of("CREATOR"))
                .department("ADMIN")
                .active(true)
                .build();

        aoAdmin = User.builder()
                .userId("AO001")
                .name("AO Admin")
                .email("ao@nrtec.in")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        semAdmin = User.builder()
                .userId("SEM001")
                .name("Seminar Admin")
                .email("seminar@nrtec.in")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        transAdmin = User.builder()
                .userId("TRN001")
                .name("Transport Admin")
                .email("transport@nrtec.in")
                .role("TRANSPORT_ADMIN")
                .roles(List.of("TRANSPORT_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        statAdmin = User.builder()
                .userId("STA001")
                .name("Stationery Admin")
                .email("stationery@nrtec.in")
                .role("STATIONERY_ADMIN")
                .roles(List.of("STATIONERY_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        mealAdmin = User.builder()
                .userId("MEA001")
                .name("Meals Admin")
                .email("meals@nrtec.in")
                .role("MEALS_ADMIN")
                .roles(List.of("MEALS_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        cseHod = User.builder()
                .userId("CSE_HOD")
                .name("CSE HOD")
                .email("csehod@nrtec.in")
                .role("DEPARTMENT_HOD")
                .roles(List.of("DEPARTMENT_HOD"))
                .department("CSE")
                .active(true)
                .build();

        eceHod = User.builder()
                .userId("ECE_HOD")
                .name("ECE HOD")
                .email("ecehod@nrtec.in")
                .role("DEPARTMENT_HOD")
                .roles(List.of("DEPARTMENT_HOD"))
                .department("ECE")
                .active(true)
                .build();

        cseUser = User.builder()
                .userId("CSE001")
                .name("CSE Faculty")
                .email("csefaculty@nrtec.in")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("CSE")
                .active(true)
                .build();

        eceUser = User.builder()
                .userId("ECE001")
                .name("ECE Faculty")
                .email("ecefaculty@nrtec.in")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("ECE")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Test 1: SEMINAR_ADMIN notification reaches only actual SEMINAR_ADMIN users, not AO_ADMIN or CREATOR")
    void test1_seminarAdminNotificationReachesOnlyActualSeminarAdmin() {
        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, semAdmin, cseUser));

        Notification notif = Notification.builder()
                .id("NOTIF-SEM-001")
                .recipientRole("SEMINAR_ADMIN")
                .recipientDept("ADMIN")
                .title("New Seminar Booking Request")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0010")
                .createdAt(LocalDateTime.now())
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("seminar@nrtec.in"), recipients,
                "SEMINAR_ADMIN notification must reach only SEMINAR_ADMIN users");
        assertFalse(recipients.contains("ao@nrtec.in"), "AO_ADMIN must not be included");
        assertFalse(recipients.contains("creator@nrtec.in"), "CREATOR must not be included");
    }

    @Test
    @DisplayName("Test 2: TRANSPORT_ADMIN notification does not reach unrelated AO_ADMIN or CREATOR")
    void test2_transportAdminNotificationDoesNotReachUnrelatedAoAdminOrCreator() {
        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, transAdmin, eceUser));

        Notification notif = Notification.builder()
                .id("NOTIF-TRN-001")
                .recipientRole("TRANSPORT_ADMIN")
                .recipientDept("ADMIN")
                .title("New Transport Request")
                .service("Transport")
                .referenceId("CSE-TRN-0020")
                .createdAt(LocalDateTime.now())
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("transport@nrtec.in"), recipients,
                "TRANSPORT_ADMIN notification must reach only TRANSPORT_ADMIN users");
        assertFalse(recipients.contains("ao@nrtec.in"), "AO_ADMIN must not leak into transport");
        assertFalse(recipients.contains("creator@nrtec.in"), "CREATOR must not leak into transport");
    }

    @Test
    @DisplayName("Test 3: STATIONERY_ADMIN notification reaches only intended STATIONERY_ADMIN users")
    void test3_stationeryAdminNotificationReachesOnlyIntendedStationeryAdmins() {
        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, semAdmin, statAdmin));

        Notification notif = Notification.builder()
                .id("NOTIF-STA-001")
                .recipientRole("STATIONERY_ADMIN")
                .recipientDept("ADMIN")
                .title("New Stationery Request")
                .service("Stationery")
                .referenceId("ECE-STA-0030")
                .createdAt(LocalDateTime.now())
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("stationery@nrtec.in"), recipients);
        assertFalse(recipients.contains("ao@nrtec.in"));
        assertFalse(recipients.contains("creator@nrtec.in"));
        assertFalse(recipients.contains("seminar@nrtec.in"));
    }

    @Test
    @DisplayName("Test 4: MEALS_ADMIN notification reaches only intended MEALS_ADMIN users")
    void test4_mealsAdminNotificationReachesOnlyIntendedMealsAdmins() {
        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, mealAdmin, cseHod));

        Notification notif = Notification.builder()
                .id("NOTIF-MEA-001")
                .recipientRole("MEALS_ADMIN")
                .recipientDept("ADMIN")
                .title("New Meal Request")
                .service("Meals")
                .referenceId("CSE-MEA-0040")
                .createdAt(LocalDateTime.now())
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("meals@nrtec.in"), recipients);
        assertFalse(recipients.contains("ao@nrtec.in"));
        assertFalse(recipients.contains("creator@nrtec.in"));
    }

    @Test
    @DisplayName("Test 5: DEPARTMENT_HOD notification reaches only explicitly targeted department HOD")
    void test5_departmentHodNotificationReachesOnlyExplicitlyTargetedDeptHods() {
        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, cseHod, eceHod, cseUser));

        Notification notif = Notification.builder()
                .id("NOTIF-HOD-001")
                .recipientRole("DEPARTMENT_HOD")
                .recipientDept("CSE")
                .title("Department Review Required")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0050")
                .createdAt(LocalDateTime.now())
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("csehod@nrtec.in"), recipients,
                "Only CSE HOD must match notification targeting CSE department HOD");
        assertFalse(recipients.contains("ecehod@nrtec.in"), "ECE HOD must NOT match CSE HOD notification");
        assertFalse(recipients.contains("ao@nrtec.in"), "AO_ADMIN must NOT match HOD notification");
        assertFalse(recipients.contains("creator@nrtec.in"), "CREATOR must NOT match HOD notification");
    }

    @Test
    @DisplayName("Test 6: User with multiple roles receives notification if they explicitly hold that role")
    void test6_userWithMultipleRolesReceivesNotificationIfExplicitlyHoldsRole() {
        User multiRoleUser = User.builder()
                .userId("MULTI001")
                .name("Multi Role Admin")
                .email("multiadmin@nrtec.in")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN", "SEMINAR_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(multiRoleUser, aoAdmin, semAdmin));

        // Test SEMINAR_ADMIN notification
        Notification semNotif = Notification.builder()
                .recipientRole("SEMINAR_ADMIN")
                .recipientDept("ADMIN")
                .build();
        List<String> semRecipients = emailService.resolvePrimaryRecipients(semNotif);
        assertTrue(semRecipients.contains("multiadmin@nrtec.in"),
                "Multi-role user must receive SEMINAR_ADMIN email because they hold SEMINAR_ADMIN");
        assertTrue(semRecipients.contains("seminar@nrtec.in"));
        assertFalse(semRecipients.contains("ao@nrtec.in"),
                "Pure AO_ADMIN must not receive SEMINAR_ADMIN notification");

        // Test AO_ADMIN notification
        Notification aoNotif = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .build();
        List<String> aoRecipients = emailService.resolvePrimaryRecipients(aoNotif);
        assertTrue(aoRecipients.contains("multiadmin@nrtec.in"),
                "Multi-role user must receive AO_ADMIN email because they hold AO_ADMIN");
        assertTrue(aoRecipients.contains("ao@nrtec.in"));
        assertFalse(aoRecipients.contains("seminar@nrtec.in"),
                "Pure SEMINAR_ADMIN must not receive AO_ADMIN notification");
    }

    @Test
    @DisplayName("Test 7: ADMIN department matching does not broadcast to every college user")
    void test7_adminDepartmentMatchingDoesNotBroadcastToEveryCollegeUser() {
        when(userRepository.findAll()).thenReturn(List.of(
                semAdmin, cseUser, eceUser, cseHod, eceHod
        ));

        Notification notif = Notification.builder()
                .recipientRole("SEMINAR_ADMIN")
                .recipientDept("ADMIN")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(List.of("seminar@nrtec.in"), recipients);
        assertFalse(recipients.contains("csefaculty@nrtec.in"));
        assertFalse(recipients.contains("ecefaculty@nrtec.in"));
        assertFalse(recipients.contains("csehod@nrtec.in"));
        assertFalse(recipients.contains("ecehod@nrtec.in"));
    }

    @Test
    @DisplayName("Test 8: Department-specific notifications do not reach other departments or ADMIN users")
    void test8_departmentSpecificNotificationsDoNotReachOtherDepartments() {
        when(userRepository.findAll()).thenReturn(List.of(
                creator, aoAdmin, cseUser, eceUser, cseHod, eceHod
        ));

        Notification notif = Notification.builder()
                .recipientRole("ALL")
                .recipientDept("CSE")
                .title("CSE Department Notice")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertTrue(recipients.contains("csefaculty@nrtec.in"), "CSE user must receive CSE notification");
        assertTrue(recipients.contains("csehod@nrtec.in"), "CSE HOD must receive CSE notification");
        assertFalse(recipients.contains("ecefaculty@nrtec.in"), "ECE user must not receive CSE notification");
        assertFalse(recipients.contains("ecehod@nrtec.in"), "ECE HOD must not receive CSE notification");
        assertFalse(recipients.contains("ao@nrtec.in"), "AO_ADMIN must not receive CSE department notice");
        assertFalse(recipients.contains("creator@nrtec.in"), "CREATOR must not receive CSE department notice");
    }

    @Test
    @DisplayName("Test 9: General announcements targeting ALL departments continue to work")
    void test9_generalAnnouncementsTargetingAllDepartmentsContinueToWork() {
        when(userRepository.findAll()).thenReturn(List.of(
                creator, aoAdmin, semAdmin, cseUser, eceUser, cseHod, eceHod
        ));

        Notification notif = Notification.builder()
                .recipientRole("ALL")
                .recipientDept("ALL")
                .title("Campus Holiday Notice")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notif);

        assertEquals(7, recipients.size(), "All active users with valid emails must match ALL/ALL announcement");
        assertTrue(recipients.contains("creator@nrtec.in"));
        assertTrue(recipients.contains("ao@nrtec.in"));
        assertTrue(recipients.contains("seminar@nrtec.in"));
        assertTrue(recipients.contains("csefaculty@nrtec.in"));
        assertTrue(recipients.contains("ecefaculty@nrtec.in"));
        assertTrue(recipients.contains("csehod@nrtec.in"));
        assertTrue(recipients.contains("ecehod@nrtec.in"));
    }

    @Test
    @DisplayName("Test 10: Existing authentication and authorization logic remains unaffected")
    void test10_existingAuthenticationAndAuthorizationTestsRemainUnaffected() {
        // User.hasServicePermission must STILL return true for CREATOR and AO_ADMIN
        assertTrue(creator.hasServicePermission("SEMINAR_ADMIN"),
                "User.hasServicePermission must remain unchanged for CREATOR authorization");
        assertTrue(aoAdmin.hasServicePermission("SEMINAR_ADMIN"),
                "User.hasServicePermission must remain unchanged for AO_ADMIN authorization");
        assertTrue(creator.hasServicePermission("TRANSPORT_ADMIN"));
        assertTrue(aoAdmin.hasServicePermission("TRANSPORT_ADMIN"));

        // But User.hasRole must strictly return false unless explicitly granted
        assertFalse(creator.hasRole("SEMINAR_ADMIN"),
                "User.hasRole must be false for CREATOR when SEMINAR_ADMIN is not explicitly assigned");
        assertFalse(aoAdmin.hasRole("SEMINAR_ADMIN"),
                "User.hasRole must be false for AO_ADMIN when SEMINAR_ADMIN is not explicitly assigned");
        assertFalse(creator.hasRole("DEPARTMENT_HOD"));
        assertFalse(aoAdmin.hasRole("DEPARTMENT_HOD"));

        // Hall assignment authorization check remains functional
        assertTrue(creator.isAssignedToHall("SH-1"), "CREATOR can access any hall");
        assertTrue(aoAdmin.isAssignedToHall("SH-1"), "AO_ADMIN can access any hall");
        assertTrue(semAdmin.isAssignedToHall("SH-1"), "SEMINAR_ADMIN can access any hall");
    }
}


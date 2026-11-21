package com.nec.collegeservices.service;

import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.NotificationRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AoAdminNotificationIsolationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private EmailService emailService;

    private User aoUser;
    private User principalUser;
    private User devUser;
    private User cseHodUser;
    private User eceHodUser;

    @BeforeEach
    void setUp() {
        aoUser = User.builder()
                .userId("ao")
                .name("Mr. I. Sridhar")
                .email("ao@nrtec.in")
                .department("ADMIN")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN", "TRANSPORT_ADMIN", "STATIONERY_ADMIN", "MEALS_ADMIN", "DEPARTMENT_HOD"))
                .active(true)
                .build();

        principalUser = User.builder()
                .userId("PRINCIPAL001")
                .name("Dr. S. Venkateswarlu")
                .email("principal@nrtec.in")
                .department("ADMIN")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .active(true)
                .build();

        devUser = User.builder()
                .userId("sriramsriram123654")
                .name("Soul finder")
                .email("sriramsriram123654@gmail.com")
                .department("CSE")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .active(true)
                .build();

        cseHodUser = User.builder()
                .userId("csehod")
                .name("Dr. S. N. Thirumala Rao")
                .email("csehod@nrtec.in")
                .department("CSE")
                .role("DEPARTMENT_HOD")
                .roles(List.of("DEPARTMENT_HOD", "DEPARTMENT_USER", "SEMINAR_COORDINATOR"))
                .active(true)
                .build();

        eceHodUser = User.builder()
                .userId("ecehod")
                .name("Dr. V. Venkata Rao")
                .email("ecehod@nrtec.in")
                .department("ECE")
                .role("DEPARTMENT_HOD")
                .roles(List.of("DEPARTMENT_HOD", "DEPARTMENT_USER", "SEMINAR_COORDINATOR"))
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(aoUser, principalUser, devUser, cseHodUser, eceHodUser));
        when(userRepository.findByUserId("ao")).thenReturn(Optional.of(aoUser));
        when(userRepository.findByUserId("PRINCIPAL001")).thenReturn(Optional.of(principalUser));
        when(userRepository.findByUserId("sriramsriram123654")).thenReturn(Optional.of(devUser));
        when(userRepository.findByUserId("csehod")).thenReturn(Optional.of(cseHodUser));
        when(userRepository.findByUserId("ecehod")).thenReturn(Optional.of(eceHodUser));
        when(userRepository.findByEmailIgnoreCase("ao@nrtec.in")).thenReturn(Optional.of(aoUser));
        when(userRepository.findByEmailIgnoreCase("principal@nrtec.in")).thenReturn(Optional.of(principalUser));
        when(userRepository.findByEmailIgnoreCase("sriramsriram123654@gmail.com")).thenReturn(Optional.of(devUser));
    }

    // =========================================================================
    // 1. Positive Tests for the 8 Call Sites (Explicit userId="ao")
    // =========================================================================

    @Test
    @DisplayName("CS1: Dual Accommodation submission routes strictly to ao@nrtec.in")
    void testCallSite1_DualAccommodation() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Accommodation")
                .type("INFO")
                .title("New Dual Accommodation Request")
                .referenceId("ACC-DUAL-0001")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS2: Recurring Accommodation submission routes strictly to ao@nrtec.in")
    void testCallSite2_RecurringAccommodation() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Accommodation")
                .type("INFO")
                .title("New Accommodation Request")
                .referenceId("ACC-REC-0002")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS3: Single Accommodation submission routes strictly to ao@nrtec.in")
    void testCallSite3_SingleAccommodation() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Accommodation")
                .type("INFO")
                .title("New Accommodation Request")
                .referenceId("ACC-2026-0003")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS4: Warden Accommodation approval routes strictly to ao@nrtec.in")
    void testCallSite4_WardenAccommodationApproval() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Accommodation")
                .type("INFO")
                .title("Accommodation Request Approved by Warden")
                .referenceId("ACC-2026-0004")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS5: Unassigned Electrical Issue routes strictly to ao@nrtec.in")
    void testCallSite5_UnassignedElectricalIssue() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Electrical Service")
                .type("ALERT")
                .title("Unassigned Electrical Issue (HIGH)")
                .referenceId("ELC-2026-0005")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS6: Completed Electrical Issue routes strictly to ao@nrtec.in")
    void testCallSite6_CompletedElectricalIssue() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Electrical Service")
                .type("INFO")
                .title("Electrical Issue Completed")
                .referenceId("ELC-2026-0006")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS7: Reopened Electrical Issue routes strictly to ao@nrtec.in")
    void testCallSite7_ReopenedElectricalIssue() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Electrical Service")
                .type("ALERT")
                .title("Electrical Issue Reopened")
                .referenceId("ELC-2026-0007")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("CS8: New Seminar Hall Booking AO alert routes strictly to ao@nrtec.in")
    void testCallSite8_NewSeminarHallRequest() {
        Notification notification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId("ao")
                .service("Seminar Hall")
                .type("INFO")
                .title("New Seminar Hall Request")
                .referenceId("SEM-2026-0008")
                .build();

        List<String> recipients = emailService.resolvePrimaryRecipients(notification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    // =========================================================================
    // 2. Layer 2 Defense-in-Depth Tests (Generic AO_ADMIN with userId=null)
    // =========================================================================

    @Test
    @DisplayName("Defense-in-depth: Operational notification without userId routes exclusively to ao@nrtec.in")
    void testDefenseInDepth_OperationalWithoutUserId() {
        Notification operationalNotification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId(null) // Unspecified userId
                .service("Accommodation")
                .type("INFO")
                .title("Accommodation Logistics Update")
                .referenceId("ACC-ACCOM-9999")
                .build();

        assertTrue(emailService.isOperationalWorkflow(operationalNotification));
        List<String> recipients = emailService.resolvePrimaryRecipients(operationalNotification);
        assertEquals(List.of("ao@nrtec.in"), recipients);
        assertFalse(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"));
    }

    @Test
    @DisplayName("Defense-in-depth: Executive governance notification with role AO_ADMIN reaches Principal and AO, excludes Developer")
    void testDefenseInDepth_ExecutiveNotification() {
        Notification executiveNotification = Notification.builder()
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .recipientUserId(null)
                .service("Administration")
                .type("EXECUTIVE")
                .title("Institutional Governance & Policy Review")
                .referenceId("GOV-2026-0001")
                .build();

        assertFalse(emailService.isOperationalWorkflow(executiveNotification));
        List<String> recipients = emailService.resolvePrimaryRecipients(executiveNotification);
        assertTrue(recipients.contains("ao@nrtec.in"));
        assertTrue(recipients.contains("principal@nrtec.in"));
        assertFalse(recipients.contains("sriramsriram123654@gmail.com"), "Developer account must be excluded from executive alerts");
    }

    // =========================================================================
    // 3. Department HOD & Hall Coordinator Isolation Tests
    // =========================================================================

    @Test
    @DisplayName("Department HOD resolution is isolated to the correct department HOD")
    void testDepartmentHodIsolation() {
        List<String> cseHods = emailService.resolveDepartmentHodEmails("CSE");
        assertEquals(List.of("csehod@nrtec.in"), cseHods);
        assertFalse(cseHods.contains("ecehod@nrtec.in"));

        List<String> eceHods = emailService.resolveDepartmentHodEmails("ECE");
        assertEquals(List.of("ecehod@nrtec.in"), eceHods);
        assertFalse(eceHods.contains("csehod@nrtec.in"));
    }
}

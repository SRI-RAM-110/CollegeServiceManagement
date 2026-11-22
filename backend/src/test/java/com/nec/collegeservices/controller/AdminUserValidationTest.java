package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.UpdateUserRequestDTO;
import com.nec.collegeservices.dto.UserDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.DepartmentRepository;
import com.nec.collegeservices.repository.UserRepository;
import com.nec.collegeservices.service.AdminUserService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserValidationTest {

    private static Validator validator;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private AdminUserService adminUserService;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: null email passes validation (preserves optional-update semantics)")
    void testUpdateUserDTO_nullEmail_passesValidation() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .department("CSE")
                .name("Updated Name")
                .email(null) // Omitted
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.isEmpty(), "Null email should be valid for optional updates");
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: empty string email passes validation (optional semantics)")
    void testUpdateUserDTO_emptyString_passesValidation() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .department("CSE")
                .email("") // Blank ignored
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.isEmpty(), "Empty string email should be valid");
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: valid institutional email passes validation")
    void testUpdateUserDTO_validInstitutionalEmail_passes() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("principal@nrtec.in")
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: valid .co email passes validation")
    void testUpdateUserDTO_validCoEmail_passes() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("partner@startup.co")
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: invalid email format fails validation")
    void testUpdateUserDTO_invalidFormat_fails() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("notanemail")
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("valid email address")));
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: truncated single-letter TLD fails validation")
    void testUpdateUserDTO_truncatedTld_fails() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("principal@nrtec.i")
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("valid email address")));
    }

    @Test
    @DisplayName("AdminUserService.updateUser rejects invalid email with BadRequestException")
    void testAdminUserService_rejectsInvalidEmail() {
        User existing = User.builder()
                .id("u1")
                .userId("ao")
                .email("ao@nrtec.in")
                .role("AO_ADMIN")
                .build();

        when(userRepository.findByUserId("ao")).thenReturn(Optional.of(existing));

        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("bad@gmail.co") // Truncated gmail
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminUserService.updateUser("ao", dto, existing));

        assertTrue(ex.getMessage().contains("Please enter a valid email address"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("AdminUserService.updateUser preserves existing email when email is omitted")
    void testAdminUserService_preservesEmailWhenOmitted() {
        User existing = User.builder()
                .id("u1")
                .userId("ao")
                .email("ao@nrtec.in")
                .name("Old Name")
                .role("AO_ADMIN")
                .build();

        when(userRepository.findByUserId("ao")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .name("New Name")
                .email(null) // Omitted
                .build();

        UserDTO result = adminUserService.updateUser("ao", dto, existing);
        assertEquals("New Name", result.getName());
        assertEquals("ao@nrtec.in", result.getEmail(), "Existing email must remain unchanged");
    }

    @Test
    @DisplayName("AdminUserService.updateUser normalizes and updates valid email")
    void testAdminUserService_normalizesAndUpdatesValidEmail() {
        User existing = User.builder()
                .id("u1")
                .userId("ao")
                .email("old@nrtec.in")
                .role("AO_ADMIN")
                .build();

        when(userRepository.findByUserId("ao")).thenReturn(Optional.of(existing));
        when(userRepository.findByEmailIgnoreCase("partner@startup.co")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("  Partner@Startup.CO  ")
                .build();

        UserDTO result = adminUserService.updateUser("ao", dto, existing);
        assertEquals("partner@startup.co", result.getEmail());
    }

    @Test
    @DisplayName("UpdateUserRequestDTO: quoted email fails validation")
    void testUpdateUserDTO_quotedEmail_fails() {
        UpdateUserRequestDTO dto = UpdateUserRequestDTO.builder()
                .email("\"principal@nrtec.in\"")
                .build();

        Set<ConstraintViolation<UpdateUserRequestDTO>> violations = validator.validate(dto);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("valid email address")));
    }
}

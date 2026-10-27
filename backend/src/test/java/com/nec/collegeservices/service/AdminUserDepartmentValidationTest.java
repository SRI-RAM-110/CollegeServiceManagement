package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.CreateUserRequestDTO;
import com.nec.collegeservices.dto.UpdateUserRequestDTO;
import com.nec.collegeservices.dto.UserDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.model.User;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class AdminUserDepartmentValidationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode(any())).thenReturn("encodedPassword123");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("1. Creating DEPARTMENT_USER without department throws BadRequestException")
    void testDepartmentUserRequiresDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("Test Faculty")
                .email("faculty@test.com")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.createUser(dto));
        assertTrue(ex.getMessage().contains("Department is required"));
    }

    @Test
    @DisplayName("2. Creating DEPARTMENT_HOD with 'NONE' department throws BadRequestException")
    void testDepartmentHODRejectsNoneDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("Test HOD")
                .email("hod@test.com")
                .role("DEPARTMENT_HOD")
                .roles(List.of("DEPARTMENT_HOD"))
                .department("NONE")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.createUser(dto));
        assertTrue(ex.getMessage().contains("Department is required"));
    }

    @Test
    @DisplayName("3. Creating GENERATOR_OPERATOR without department succeeds with department=null")
    void testGeneratorOperatorAllowsNoDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("Gen Operator")
                .email("genop@test.com")
                .role("GENERATOR_OPERATOR")
                .roles(List.of("GENERATOR_OPERATOR"))
                .department("")
                .build();

        UserDTO created = adminUserService.createUser(dto);
        assertNotNull(created);
        assertNull(created.getDepartment());
        assertEquals("GENERATOR_OPERATOR", created.getRole());
    }

    @Test
    @DisplayName("4. Creating SEMINAR_TECHNICIAN without department succeeds with department=null")
    void testSeminarTechnicianAllowsNoDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("Tech Person")
                .email("tech@test.com")
                .role("SEMINAR_TECHNICIAN")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .department("NONE")
                .build();

        UserDTO created = adminUserService.createUser(dto);
        assertNotNull(created);
        assertNull(created.getDepartment());
    }

    @Test
    @DisplayName("5. Creating user with IT department stores IT cleanly")
    void testCreateUserWithITDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("IT Faculty")
                .email("itfac@test.com")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("IT")
                .build();

        UserDTO created = adminUserService.createUser(dto);
        assertNotNull(created);
        assertEquals("IT", created.getDepartment());
    }

    @Test
    @DisplayName("6. Creating user with CSDS department stores CSDS cleanly")
    void testCreateUserWithCSDSDepartment() {
        CreateUserRequestDTO dto = CreateUserRequestDTO.builder()
                .name("CSDS Faculty")
                .email("csdsfac@test.com")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("CSDS")
                .build();

        UserDTO created = adminUserService.createUser(dto);
        assertNotNull(created);
        assertEquals("CSDS", created.getDepartment());
    }

    @Test
    @DisplayName("7. Updating unassigned user to empty department keeps department=null without error")
    void testUpdateUnassignedUserKeepsNullDepartment() {
        User existing = User.builder()
                .id("u1")
                .userId("gen_op_1")
                .name("Gen Operator")
                .email("gen@test.com")
                .role("GENERATOR_OPERATOR")
                .roles(new ArrayList<>(List.of("GENERATOR_OPERATOR")))
                .department(null)
                .build();

        when(userRepository.findByUserId("gen_op_1")).thenReturn(Optional.of(existing));

        UpdateUserRequestDTO updateDTO = UpdateUserRequestDTO.builder()
                .department("")
                .build();

        UserDTO updated = adminUserService.updateUser("gen_op_1", updateDTO);
        assertNotNull(updated);
        assertNull(updated.getDepartment());
    }

    @Test
    @DisplayName("8. Updating DEPARTMENT_USER to empty department throws BadRequestException")
    void testUpdateDepartmentUserToEmptyThrows() {
        User existing = User.builder()
                .id("u2")
                .userId("fac_1")
                .name("Faculty")
                .email("fac@test.com")
                .role("DEPARTMENT_USER")
                .roles(new ArrayList<>(List.of("DEPARTMENT_USER")))
                .department("CSE")
                .build();

        when(userRepository.findByUserId("fac_1")).thenReturn(Optional.of(existing));

        UpdateUserRequestDTO updateDTO = UpdateUserRequestDTO.builder()
                .department("")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.updateUser("fac_1", updateDTO));
        assertTrue(ex.getMessage().contains("Department is required"));
    }

    @Test
    @DisplayName("9. getUsers filtering by UNASSIGNED returns only users with null/empty department")
    void testFilterByUnassigned() {
        User u1 = User.builder().userId("u1").name("Op").department(null).roles(List.of("GENERATOR_OPERATOR")).build();
        User u2 = User.builder().userId("u2").name("Fac").department("IT").roles(List.of("DEPARTMENT_USER")).build();
        User u3 = User.builder().userId("u3").name("Csds").department("CSDS").roles(List.of("DEPARTMENT_USER")).build();

        when(userRepository.findAll()).thenReturn(List.of(u1, u2, u3));

        List<UserDTO> unassigned = adminUserService.getUsers(null, null, "UNASSIGNED", null, null);
        assertEquals(1, unassigned.size());
        assertEquals("u1", unassigned.get(0).getUserId());

        List<UserDTO> itUsers = adminUserService.getUsers(null, null, "IT", null, null);
        assertEquals(1, itUsers.size());
        assertEquals("u2", itUsers.get(0).getUserId());

        List<UserDTO> csdsUsers = adminUserService.getUsers(null, null, "CSDS", null, null);
        assertEquals(1, csdsUsers.size());
        assertEquals("u3", csdsUsers.get(0).getUserId());
    }
}

package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    private String email;
    private String userId;

    @NotBlank(message = "Password is required")
    private String password;

    public LoginRequest(String identifier, String password) {
        this.email = identifier;
        this.userId = identifier;
        this.password = password;
    }
}

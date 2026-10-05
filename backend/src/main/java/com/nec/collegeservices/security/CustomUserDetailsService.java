package com.nec.collegeservices.security;

import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        if (identifier == null || identifier.isBlank()) {
            throw new UsernameNotFoundException("Login identifier cannot be empty");
        }
        String clean = identifier.trim();
        User user = userRepository.findByEmailIgnoreCase(clean)
                .or(() -> userRepository.findByUserId(clean))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email or ID: " + clean));
        return new CustomUserDetails(user);
    }
}

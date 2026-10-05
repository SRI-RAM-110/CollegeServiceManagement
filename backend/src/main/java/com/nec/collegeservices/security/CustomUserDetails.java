package com.nec.collegeservices.security;

import com.nec.collegeservices.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {
    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        java.util.List<String> effectiveRoles = user.getEffectiveRoles();
        if (effectiveRoles == null || effectiveRoles.isEmpty()) {
            return Collections.emptyList();
        }
        java.util.List<GrantedAuthority> authorities = new java.util.ArrayList<>();
        for (String r : effectiveRoles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + r));
            authorities.add(new SimpleGrantedAuthority(r));
        }
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUserId();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getActive() == null || Boolean.TRUE.equals(user.getActive());
    }
}

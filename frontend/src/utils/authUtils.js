/**
 * Canonical helper to extract all effective roles for a user.
 * 
 * Safely handles:
 * - user.role (primary role string)
 * - user.roles (array of roles from database)
 * - user.effectiveRoles (array of effective roles computed by backend getEffectiveRoles())
 * - user.servicePermissions (array of service permissions from User / UserDTO)
 * - user.assignedHostels (derived BOYS_HOSTEL_ADMIN / GIRLS_HOSTEL_ADMIN / ACCOMMODATION_ADMIN)
 * - user.assignedHallIds (derived SEMINAR_COORDINATOR)
 * - DEPARTMENT_HOD implying DEPARTMENT_USER
 */
export const getUserRoles = (user) => {
  if (!user) return [];
  const rolesSet = new Set();

  // 1. Primary role
  if (user.role && typeof user.role === 'string' && user.role.trim()) {
    rolesSet.add(user.role.trim().toUpperCase());
  }

  // 2. Roles array
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        rolesSet.add(r.trim().toUpperCase());
      }
    });
  }

  // 3. Effective roles (returned by /api/auth/me from backend getEffectiveRoles())
  if (Array.isArray(user.effectiveRoles)) {
    user.effectiveRoles.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        rolesSet.add(r.trim().toUpperCase());
      }
    });
  }

  // 4. Service permissions (e.g. ACCOMMODATION_ADMIN, SEMINAR_ADMIN, etc.)
  if (Array.isArray(user.servicePermissions)) {
    user.servicePermissions.forEach((sp) => {
      if (sp && typeof sp === 'string' && sp.trim()) {
        rolesSet.add(sp.trim().toUpperCase());
      }
    });
  }

  // 5. Assigned hostels
  if (Array.isArray(user.assignedHostels) && user.assignedHostels.length > 0) {
    rolesSet.add('ACCOMMODATION_ADMIN');
    user.assignedHostels.forEach((h) => {
      if (typeof h === 'string') {
        const lower = h.trim().toLowerCase();
        if (lower.includes('boys')) {
          rolesSet.add('BOYS_HOSTEL_ADMIN');
        }
        if (lower.includes('girls')) {
          rolesSet.add('GIRLS_HOSTEL_ADMIN');
        }
      }
    });
  }

  // 6. Assigned halls (derive SEMINAR_COORDINATOR only if user is not specifically a technician without coordinator role)
  if (Array.isArray(user.assignedHallIds) && user.assignedHallIds.length > 0) {
    if (!rolesSet.has('SEMINAR_TECHNICIAN') || rolesSet.has('SEMINAR_COORDINATOR')) {
      rolesSet.add('SEMINAR_COORDINATOR');
    }
  }

  // 7. Department HODs are also Department Users
  if (rolesSet.has('DEPARTMENT_HOD')) {
    rolesSet.add('DEPARTMENT_USER');
  }

  return Array.from(rolesSet);
};

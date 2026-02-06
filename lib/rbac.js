// lib/rbac.js
export const ROLE_ORDER = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export function hasMinRole(userRole, minRole) {
  const a = ROLE_ORDER[String(userRole || "USER").toUpperCase()] ?? 1;
  const b = ROLE_ORDER[String(minRole || "USER").toUpperCase()] ?? 1;
  return a >= b;
}

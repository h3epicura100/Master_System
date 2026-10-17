import { ROLES } from '../constants/roles';

export function hasPermission(currentUser, userPermissions = [], pageKey) {
  if (!currentUser) return false;
  if (pageKey === 'dashboard') return true;
  if (currentUser.role === ROLES.ADMIN || currentUser.has_full_access) return true;

  if (Array.isArray(userPermissions)) {
    return userPermissions.includes('ALL') || userPermissions.includes(pageKey);
  }
  return false;
}

import { useAuth as useMasterAuth } from '../../../context/AuthContext';

/**
 * Adapter hook for PMS modules:
 * Bridges Master-System's centralized AuthContext into the shape expected by PMS components:
 * - currentUser: { id, display_name, role, has_full_access, allowedPages, whatsapp_number, mobile_number }
 * - hasAccess(pageKey): boolean
 * - isAdmin: boolean
 * - setUsers: dummy setter
 */
export function useAuth() {
  const masterAuth = useMasterAuth();
  const { currentUser, isAdmin, canAccessPage } = masterAuth;

  const isFull = isAdmin() || currentUser?.page_access?.pms?.full_access === true;
  const pmsPages = Array.isArray(currentUser?.page_access?.pms?.pages) ? currentUser.page_access.pms.pages : [];
  const allowedPages = isFull ? ['ALL'] : (pmsPages.length > 0 ? pmsPages : ['dashboard']);

  const pmsUser = currentUser ? {
    ...currentUser,
    id: currentUser.username || currentUser.id,
    display_name: currentUser.full_name || currentUser.username,
    role: isAdmin() ? 'admin' : (currentUser.page_access?.pms?.role || 'staff'),
    has_full_access: isFull,
    allowedPages: allowedPages,
    whatsapp_number: currentUser.mobile_number || '',
    whatsappNumber: currentUser.mobile_number || '',
  } : null;

  return {
    ...masterAuth,
    currentUser: pmsUser,
    hasAccess: (pageKey) => canAccessPage('pms', pageKey),
    setUsers: () => {},
  };
}

export default useAuth;

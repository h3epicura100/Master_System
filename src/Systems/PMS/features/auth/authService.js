import { supabase } from '../../services/supabase';

const LOCAL_USERS_KEY = 'pms_users_v2';

const DEFAULT_USERS = [
  {
    id: 'admin',
    password_hash: 'admin123',
    password: 'admin123',
    display_name: 'Administrator',
    name: 'Administrator',
    role: 'admin',
    has_full_access: true,
    allowedPages: ['ALL'],
  }
];

export const authService = {
  /**
   * Loads users from Master-System's centralized `master_users` table
   * filtering strictly for active users with PMS access.
   * Falls back to `pms_users` or localStorage if needed.
   */
  async loadUsers() {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('*')
        .eq('is_active', true);

      if (!error && Array.isArray(data) && data.length > 0) {
        const pmsUsers = data
          .filter(u => {
            const pa = typeof u.page_access === 'string' ? JSON.parse(u.page_access) : (u.page_access || {});
            return u.role === 'admin' || pa.pms?.access === true;
          })
          .map(u => {
            const pa = typeof u.page_access === 'string' ? JSON.parse(u.page_access) : (u.page_access || {});
            const isFull = u.role === 'admin' || pa.pms?.full_access === true;
            const perms = Array.isArray(pa.pms?.pages) ? pa.pms.pages : [];
            return {
              id: u.username || u.id,
              userId: u.id,
              name: u.full_name || u.username,
              display_name: u.full_name || u.username,
              role: u.role === 'admin' ? 'admin' : (pa.pms?.role || 'staff'),
              whatsapp_number: u.mobile_number || '',
              whatsappNumber: u.mobile_number || '',
              has_full_access: isFull,
              allowedPages: isFull ? ['ALL'] : (perms.length ? perms : ['dashboard']),
            };
          });

        if (pmsUsers.length > 0) {
          return pmsUsers;
        }
      }
    } catch (e) {
      console.warn('[PMS AuthService] Error loading from master_users, falling back to pms_users:', e);
    }

    try {
      const { data, error } = await supabase
        .from('pms_users')
        .select(`
          *,
          pms_user_permissions(permission_key)
        `);

      if (!error && data && data.length > 0) {
        return data.map(u => {
          const perms = (u.pms_user_permissions || []).map(p => p.permission_key);
          const isFull = Boolean(u.role === 'admin' || u.has_full_access);
          return {
            ...u,
            name: u.display_name || u.id,
            password: u.password_hash,
            has_full_access: isFull,
            allowedPages: isFull ? ['ALL'] : (perms.length ? perms.filter(p => p !== 'ALL') : ['dashboard']),
          };
        });
      }
    } catch (e) {
      console.warn('Using local users fallback');
    }

    const saved = localStorage.getItem(LOCAL_USERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(u => {
          const isFull = Boolean(u.role === 'admin' || u.has_full_access);
          const cleanPages = (u.allowedPages || []).filter(p => p !== 'ALL');
          return {
            ...u,
            name: u.display_name || u.name || u.id,
            display_name: u.display_name || u.name || u.id,
            password: u.password_hash || u.password,
            has_full_access: isFull,
            allowedPages: isFull ? ['ALL'] : (cleanPages.length ? cleanPages : ['dashboard']),
          };
        });
      } catch (e) {}
    }

    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  /**
   * Authenticates user matching username & password.
   */
  async login(id, password) {
    const users = await this.loadUsers();
    const trimmedId = id.trim().toLowerCase();
    const match = users.find(u =>
      u.id.toLowerCase() === trimmedId &&
      (u.password_hash === password || u.password === password)
    );
    if (!match) {
      throw new Error('Incorrect ID or password.');
    }
    return match;
  },

  /**
   * Saves updated user list to localStorage.
   */
  async saveUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }
};

export default authService;

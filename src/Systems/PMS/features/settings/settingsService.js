import { supabase } from '../../services/supabase';
import { authService } from '../auth/authService';

export const ALL_PERMISSIONS_MASTER = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'menuFinalize', label: 'Menu Finalize' },
  { key: 'chef', label: 'Kitchen Preparation' },
  { key: 'tagPrints', label: 'Tag Print' },
  { key: 'dress', label: 'Dress' },
  { key: 'decor', label: 'Decor List' },
  { key: 'crockery', label: 'Crockery List' },
  { key: 'kitchenRawMaterial', label: 'Menu Kitchen Requirement' },
  { key: 'vegetables', label: 'Vegetables' },
  { key: 'cheeseDairy', label: 'Cheese & Dairy Products' },
  { key: 'vendorOrders', label: 'Vendor Coordination' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'iceWaterRequirement', label: 'Ice & Water Requirement' },
  { key: 'loadingBoysAunties', label: 'Loading Boys & Aunties' },
  { key: 'vehicleRequirement', label: 'Vehicle Requirement' },
  { key: 'gasCylinder', label: 'Gas Cylinder' },
  { key: 'freshFlowers', label: 'Fresh Flowers' },
  { key: 'waiters', label: 'Waiters' },
  { key: 'outsourcingTeam', label: 'Outsourcing Team Requirement' },
  { key: 'masters', label: 'Master Data' },
  { key: 'settings', label: 'Settings' },
];

export const settingsService = {
  async getUsers() {
    return authService.loadUsers();
  },

  async saveUser(userData, isEditing) {
    const users = await this.getUsers();

    const isFull = Boolean(userData.role === 'admin' || userData.has_full_access);
    const pageList = isFull ? ['ALL'] : (userData.allowedPages || ['dashboard']).filter(p => p !== 'ALL');

    const formattedUser = {
      id: userData.id,
      password_hash: userData.password_hash || userData.password || 'admin123',
      password: userData.password_hash || userData.password || 'admin123',
      display_name: userData.display_name || userData.name || userData.id,
      name: userData.display_name || userData.name || userData.id,
      whatsapp_number: userData.whatsapp_number || userData.whatsappNumber || null,
      role: userData.role,
      has_full_access: isFull,
      allowedPages: pageList,
    };

    if (isEditing) {
      const idx = users.findIndex(u => u.id.toLowerCase() === userData.id.toLowerCase());
      if (idx !== -1) {
        users[idx] = formattedUser;
      }
    } else {
      if (users.some(u => u.id.toLowerCase() === userData.id.toLowerCase())) {
        throw new Error('That User ID is already in use.');
      }
      users.push(formattedUser);
    }

    try {
      // 1. Ensure master permissions exist in pms_permissions table to prevent FK constraint violations
      const { error: permSeedErr } = await supabase
        .from('pms_permissions')
        .upsert(ALL_PERMISSIONS_MASTER, { onConflict: 'key' });
      if (permSeedErr) {
        console.warn('pms_permissions upsert warning:', permSeedErr);
      }

      // 2. Upsert pms_users table in Supabase
      const { error: userError } = await supabase.from('pms_users').upsert({
        id: formattedUser.id,
        password_hash: formattedUser.password_hash,
        display_name: formattedUser.display_name,
        whatsapp_number: formattedUser.whatsapp_number,
        role: formattedUser.role,
        has_full_access: formattedUser.has_full_access,
      });
      if (userError) {
        throw new Error(`Failed to save user account: ${userError.message}`);
      }

      // 3. Always clear old permission rows for this user in junction table
      const { error: delError } = await supabase
        .from('pms_user_permissions')
        .delete()
        .eq('user_id', formattedUser.id);
      if (delError) {
        throw new Error(`Failed to clear old permissions: ${delError.message}`);
      }

      // 4. Insert new permissions if not full access
      if (!isFull) {
        const permRows = pageList
          .filter(key => key !== 'ALL' && key !== 'dashboard')
          .map(key => ({
            user_id: formattedUser.id,
            permission_key: key,
          }));

        if (permRows.length > 0) {
          const { error: insertError } = await supabase
            .from('pms_user_permissions')
            .insert(permRows);
          if (insertError) {
            throw new Error(`Failed to save user permissions: ${insertError.message}`);
          }
        }
      }
    } catch (e) {
      console.error('Supabase user save error:', e);
      throw e;
    }

    // 5. Reload fresh state from Supabase to guarantee joined permissions are in sync
    const freshUsers = await authService.loadUsers();
    await authService.saveUsers(freshUsers);
    return freshUsers;
  },

  async deleteUser(id, currentUserId) {
    if (id === currentUserId) {
      throw new Error('You cannot delete the account you are logged in as.');
    }

    const users = await this.getUsers();
    const admins = users.filter(u => u.role === 'admin');
    const target = users.find(u => u.id === id);

    if (target?.role === 'admin' && admins.length <= 1) {
      throw new Error('At least one admin account must remain.');
    }

    try {
      const { error: permErr } = await supabase.from('pms_user_permissions').delete().eq('user_id', id);
      if (permErr) console.warn('Delete permissions warning:', permErr);

      const { error: userErr } = await supabase.from('pms_users').delete().eq('id', id);
      if (userErr) throw new Error(`Failed to delete user: ${userErr.message}`);
    } catch (e) {
      console.error('Supabase delete error:', e);
      throw e;
    }

    const freshUsers = await authService.loadUsers();
    await authService.saveUsers(freshUsers);
    return freshUsers;
  }
};

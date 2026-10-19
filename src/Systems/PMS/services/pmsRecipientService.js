import { supabase } from './supabase';

/**
 * Normalizes phone number into digits without '+' or spaces (e.g. 919876543210).
 */
export function normalizePhoneNumber(rawNumber) {
  if (!rawNumber) return null;
  let digits = String(rawNumber).replace(/\D/g, '');
  if (!digits) return null;

  // If leading 0 with 11 digits (e.g. 09876543210), strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // 10 digits Indian mobile number (e.g. 9876543210) -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

/**
 * 17 operational department page IDs recognized across H3MS.
 * Strictly maps to Global Settings PMS department access checkboxes.
 */
export const PMS_DEPARTMENT_PAGE_IDS = new Set([
  'chef',
  'tagPrints',
  'dress',
  'decor',
  'crockery',
  'kitchenRawMaterial',
  'vegetables',
  'cheeseDairy',
  'vendorOrders',
  'bakery',
  'iceWaterRequirement',
  'loadingBoysAunties',
  'vehicleRequirement',
  'gasCylinder',
  'freshFlowers',
  'waiters',
  'outsourcingTeam',
]);

/**
 * Normalizes legacy database department keys or task keys into standard PMS page IDs.
 */
export function normalizeDeptKey(rawKey) {
  if (!rawKey) return '';
  const key = String(rawKey).trim();

  const ALIAS_MAP = {
    inform_to_chef: 'chef',
    informToChef: 'chef',
    chef: 'chef',
    tag_prints: 'tagPrints',
    tag_print: 'tagPrints',
    tagPrint: 'tagPrints',
    tagPrints: 'tagPrints',
    dress: 'dress',
    decor: 'decor',
    decor_list: 'decor',
    decorList: 'decor',
    crockery: 'crockery',
    crockery_list: 'crockery',
    crockeryList: 'crockery',
    kitchen_raw_material: 'kitchenRawMaterial',
    kitchenRawMaterial: 'kitchenRawMaterial',
    vegetables: 'vegetables',
    vegetable: 'vegetables',
    cheese_dairy: 'cheeseDairy',
    cheeseDairy: 'cheeseDairy',
    vendor_orders: 'vendorOrders',
    vendorOrders: 'vendorOrders',
    bakery: 'bakery',
    ice_water_requirement: 'iceWaterRequirement',
    iceWaterRequirement: 'iceWaterRequirement',
    loading_boys_aunties: 'loadingBoysAunties',
    loadingBoysAunties: 'loadingBoysAunties',
    vehicle_requirement: 'vehicleRequirement',
    vehicleRequirement: 'vehicleRequirement',
    gas_cylinder: 'gasCylinder',
    gasCylinder: 'gasCylinder',
    fresh_flowers: 'freshFlowers',
    freshFlowers: 'freshFlowers',
    waiters: 'waiters',
    outsourcing_team: 'outsourcingTeam',
    outsourcingTeam: 'outsourcingTeam',
  };

  return ALIAS_MAP[key] || key;
}

export const pmsRecipientService = {
  /**
   * Fetches all active users from Master-System's centralized master_users table
   * with safely parsed page_access permissions and normalized mobile numbers.
   */
  async loadActiveGlobalUsers() {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('id, username, full_name, role, mobile_number, is_active, page_access')
        .neq('is_active', false);

      if (error) {
        console.error('[PmsRecipientService] Error fetching master_users:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      return data.map((u) => {
        let pa = u.page_access;
        if (typeof pa === 'string') {
          try {
            pa = JSON.parse(pa);
          } catch (_) {
            pa = {};
          }
        }
        pa = pa || {};

        const pmsAccess = pa.pms || {};
        const isAdmin =
          u.role === 'admin' ||
          pmsAccess.role === 'admin' ||
          pmsAccess.full_access === true;

        const isStaff = !isAdmin;
        const hasPmsAccess = isAdmin || pmsAccess.access === true;
        const rawPages = Array.isArray(pmsAccess.pages) ? pmsAccess.pages : [];
        const normalizedPages = rawPages.map((p) => normalizeDeptKey(p));

        const normalizedPhone = normalizePhoneNumber(u.mobile_number);

        return {
          id: u.id,
          username: u.username || '',
          displayName: u.full_name || u.username || 'User',
          role: isAdmin ? 'admin' : 'staff',
          isAdmin,
          isStaff,
          hasPmsAccess,
          assignedPages: normalizedPages,
          phone: normalizedPhone,
          rawUser: u,
        };
      });
    } catch (err) {
      console.error('[PmsRecipientService] Unexpected error loading active global users:', err);
      return [];
    }
  },

  /**
   * Resolves recipient phone numbers for Delay Alerts & Scheduled Reminders.
   *
   * STRICT REQUIREMENT:
   * - ONLY active users whose role is STAFF.
   * - Must have the specific department page assigned in H3MS (page_access.pms.pages).
   * - Admins are strictly EXCLUDED (Admins do not receive delay reminders).
   *
   * @param {string} rawDeptKey Department identifier
   * @returns {Promise<{ recipients: string[], recipientDetails: Array<{ phone: string, displayName: string, username: string, userId: string, role: string, deptKey: string }> }>}
   */
  async getDelayReminderRecipients(rawDeptKey) {
    const deptKey = normalizeDeptKey(rawDeptKey);
    const users = await this.loadActiveGlobalUsers();

    const recipientDetails = [];
    const phoneSet = new Set();

    users.forEach((u) => {
      // Must have valid phone
      if (!u.phone) return;

      // Must have PMS access
      if (!u.hasPmsAccess) return;

      // REQUIREMENT: Role must be STAFF. Admins do NOT receive delay messages!
      if (!u.isStaff) {
        return;
      }

      // REQUIREMENT: Must have this specific department page assigned in H3MS
      const hasDept = u.assignedPages.includes(deptKey);
      if (hasDept) {
        if (!phoneSet.has(u.phone)) {
          phoneSet.add(u.phone);
          recipientDetails.push({
            phone: u.phone,
            displayName: u.displayName,
            username: u.username,
            userId: u.id,
            role: 'staff',
            deptKey,
          });
          console.log(
            `[PmsRecipientService] Delay reminder recipient matched: ${u.displayName} (@${u.username}) -> Dept: ${deptKey}, Phone: ${u.phone}`
          );
        }
      }
    });

    return {
      recipients: Array.from(phoneSet),
      recipientDetails,
    };
  },

  /**
   * Resolves recipient phone numbers for Menu Finalized Broadcasts.
   *
   * STRICT REQUIREMENT:
   * 1. ALL users whose role is ADMIN (Master Admin or PMS Admin / Full Access).
   * 2. Users whose role is STAFF AND who have at least one department page assigned in H3MS.
   *    (Staff without department pages or general non-department access are excluded).
   *
   * @returns {Promise<{ recipients: string[], recipientDetails: Array<{ phone: string, displayName: string, username: string, userId: string, role: string, matchedReason: string }> }>}
   */
  async getMenuFinalizedRecipients() {
    const users = await this.loadActiveGlobalUsers();

    const recipientDetails = [];
    const phoneSet = new Set();

    users.forEach((u) => {
      // Must have valid phone
      if (!u.phone) return;

      // Condition 1: ALL Admins receive menu finalize notifications
      if (u.isAdmin) {
        if (!phoneSet.has(u.phone)) {
          phoneSet.add(u.phone);
          recipientDetails.push({
            phone: u.phone,
            displayName: u.displayName,
            username: u.username,
            userId: u.id,
            role: 'admin',
            matchedReason: 'Admin Broadcast (Master / PMS Admin)',
          });
          console.log(
            `[PmsRecipientService] Menu Finalize recipient added (ADMIN): ${u.displayName} (@${u.username}), Phone: ${u.phone}`
          );
        }
        return;
      }

      // Condition 2: Staff with department pages assigned in H3MS
      if (u.isStaff && u.hasPmsAccess) {
        const assignedDepts = u.assignedPages.filter((pageId) =>
          PMS_DEPARTMENT_PAGE_IDS.has(pageId)
        );

        if (assignedDepts.length > 0) {
          if (!phoneSet.has(u.phone)) {
            phoneSet.add(u.phone);
            recipientDetails.push({
              phone: u.phone,
              displayName: u.displayName,
              username: u.username,
              userId: u.id,
              role: 'staff',
              matchedReason: `Staff with department page(s): ${assignedDepts.join(', ')}`,
            });
            console.log(
              `[PmsRecipientService] Menu Finalize recipient added (STAFF): ${u.displayName} (@${u.username}) -> [${assignedDepts.join(', ')}], Phone: ${u.phone}`
            );
          }
        } else {
          console.log(
            `[PmsRecipientService] Skipping staff user ${u.displayName} (@${u.username}) for Menu Finalize: No department pages assigned.`
          );
        }
      }
    });

    return {
      recipients: Array.from(phoneSet),
      recipientDetails,
    };
  },
};

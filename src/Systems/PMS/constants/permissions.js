import { DEPT_LIST } from './departments';

export const NAVIGATION = [
  {
    group: '',
    items: [
      { route: '/dashboard', key: 'dashboard', label: 'Dashboard' }
    ]
  },
  {
    group: 'Booking Management',
    items: [
      { route: '/bookings', key: 'bookings', label: 'Bookings' },
      { route: '/menu-finalize', key: 'menuFinalize', label: 'Menu Finalize' },
      { route: '/menu-chatbot', key: 'menuChatbot', label: 'Menu AI Assistant' },
    ]
  },
  {
    group: 'Communication',
    items: [
      { route: '/whatsapp', key: 'whatsapp', label: 'WhatsApp' },
    ]
  },
  {
    group: 'Department Workflow',
    items: [
      { route: '/kitchen-preparation', key: 'chef', label: 'Kitchen Preparation' },
      { route: '/tag-print', key: 'tagPrints', label: 'Tag Print' },
      { route: '/dress', key: 'dress', label: 'Dress' },
      { route: '/decor-list', key: 'decor', label: 'Decor List' },
      { route: '/crockery-list', key: 'crockery', label: 'Crockery List' },
      { route: '/menu-kitchen-requirement', key: 'kitchenRawMaterial', label: 'Menu Kitchen Requirement' },
      { route: '/vegetables', key: 'vegetables', label: 'Vegetables' },
      { route: '/cheese-dairy-products', key: 'cheeseDairy', label: 'Cheese & Dairy Products' },
      { route: '/vendor-coordination', key: 'vendorOrders', label: 'Vendor Coordination' },
      { route: '/bakery', key: 'bakery', label: 'Bakery' },
      { route: '/ice-water-requirement', key: 'iceWaterRequirement', label: 'Ice & Water Requirement' },
      { route: '/loading-boys-aunties', key: 'loadingBoysAunties', label: 'Loading Boys & Aunties' },
      { route: '/vehicle-requirement', key: 'vehicleRequirement', label: 'Vehicle Requirement' },
      { route: '/gas-cylinder', key: 'gasCylinder', label: 'Gas Cylinder' },
      { route: '/fresh-flowers', key: 'freshFlowers', label: 'Fresh Flowers' },
      { route: '/waiters', key: 'waiters', label: 'Waiters' },
      { route: '/outsourcing-team', key: 'outsourcingTeam', label: 'Outsourcing Team Requirement' },
    ]
  },
  {
    group: 'Admin',
    items: [
      { route: '/masters', key: 'masters', label: 'Master Data', adminOnly: true },
      { route: '/settings', key: 'settings', label: 'Settings', adminOnly: true }
    ]
  }
];

export const ALL_PAGE_KEYS = ['dashboard', 'bookings', 'menuFinalize', 'menuChatbot', 'whatsapp', 'masters', 'settings', ...DEPT_LIST.map(d => d.key)];


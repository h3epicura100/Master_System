import React from 'react';

/**
 * Adapter for Crockery IMS:
 * In standalone Crockery IMS, pages are wrapped in AdminLayout which provided its own sidebar and top navigation.
 * Inside Master-System, the main navigation is provided by MasterLayout and Sidebar.
 * This component simply renders the children cleanly without duplicating navigation.
 */
export default function AdminLayout({ children }) {
  return (
    <div className="w-full min-w-0">
      {children}
    </div>
  );
}

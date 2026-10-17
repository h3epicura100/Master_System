import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function VendorCoordinationPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'vendorOrders');
  return <DepartmentPage deptConfig={cfg} />;
}

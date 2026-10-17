import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function KitchenPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'kitchenRawMaterial');
  return <DepartmentPage deptConfig={cfg} />;
}

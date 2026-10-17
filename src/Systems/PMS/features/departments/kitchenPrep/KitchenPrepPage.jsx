import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function KitchenPrepPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'chef');
  return <DepartmentPage deptConfig={cfg} />;
}

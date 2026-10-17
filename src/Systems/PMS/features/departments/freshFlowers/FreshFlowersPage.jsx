import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function FreshFlowersPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'freshFlowers');
  return <DepartmentPage deptConfig={cfg} />;
}

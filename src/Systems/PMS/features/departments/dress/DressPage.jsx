import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function DressPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'dress');
  return <DepartmentPage deptConfig={cfg} />;
}

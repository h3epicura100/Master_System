import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function BakeryPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'bakery');
  return <DepartmentPage deptConfig={cfg} />;
}

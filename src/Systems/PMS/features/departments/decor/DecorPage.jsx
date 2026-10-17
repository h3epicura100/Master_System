import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function DecorPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'decor');
  return <DepartmentPage deptConfig={cfg} />;
}

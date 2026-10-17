import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function CrockeryPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'crockery');
  return <DepartmentPage deptConfig={cfg} />;
}

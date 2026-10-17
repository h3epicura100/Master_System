import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function GasCylinderPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'gasCylinder');
  return <DepartmentPage deptConfig={cfg} />;
}

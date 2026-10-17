import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function OutsourcingPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'outsourcingTeam');
  return <DepartmentPage deptConfig={cfg} />;
}

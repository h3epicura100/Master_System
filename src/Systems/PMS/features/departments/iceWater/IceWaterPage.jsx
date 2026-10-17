import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function IceWaterPage() {
  const cfg = DEPT_LIST.find(d => d.key === 'iceWaterRequirement');
  return <DepartmentPage deptConfig={cfg} />;
}

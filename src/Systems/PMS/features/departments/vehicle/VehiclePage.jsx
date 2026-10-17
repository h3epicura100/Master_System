import React from 'react';
import { DepartmentPage } from '../shared/DepartmentPage';
import { DEPT_LIST } from '../../../constants/departments';

export function VehiclePage() {
  const cfg = DEPT_LIST.find(d => d.key === 'vehicleRequirement');
  return <DepartmentPage deptConfig={cfg} />;
}

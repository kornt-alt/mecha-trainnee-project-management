// frontend/src/components/dashboard/ProjectBudgetOverview.js — กราฟเปรียบเทียบงบประมาณรายหมวด (แทน Monthly Project Cost Overview เดิม)
// คุม state ช่วงเวลาย้อนหลัง (1/2/3/6/9/12 เดือน) แล้วส่งข้อมูลที่ผ่าน adapter ให้ BudgetBarChart
import React, { useMemo, useState } from 'react';
import BudgetBarChart from '../BudgetBarChart/BudgetBarChart';
import { buildBudgetCategories } from '../BudgetBarChart/budgetBarChartData';
import { MOCK_PROJECT_COST_ITEMS } from '../../data/mockProjectCosts';

export default function ProjectBudgetOverview({ projects = [] }) {
  // ช่วงเวลาย้อนหลังที่เลือก (เดือน) — ค่าเริ่มต้น 6 เดือนตรงกับข้อมูลต้นทุนที่มีทั้งหมด
  const [monthsBack, setMonthsBack] = useState(6);

  // adapter คืน categories + rangeNotice (แจ้งเตือนไทยเมื่อช่วงที่เลือกเกินข้อมูล 6 เดือนที่มี)
  const { categories, rangeNotice } = useMemo(
    () => buildBudgetCategories(projects, MOCK_PROJECT_COST_ITEMS, monthsBack),
    [projects, monthsBack],
  );

  return (
    <BudgetBarChart
      className="border-0 shadow-sm mb-4"
      categories={categories}
      rangeValue={monthsBack}
      onRangeChange={setMonthsBack}
      rangeNotice={rangeNotice}
    />
  );
}

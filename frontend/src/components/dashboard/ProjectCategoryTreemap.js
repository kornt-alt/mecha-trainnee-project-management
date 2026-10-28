// frontend/src/components/dashboard/ProjectCategoryTreemap.js — Treemap แสดงสัดส่วนจำนวนโครงการแยกตามประเภท
import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { ChartPie } from '../common/Icons';

const TILE_COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--muted)', 'var(--red)', 'var(--blue-hover)'];

function makeColumns(categories) {
  const columns = [{ total: 0, items: [] }, { total: 0, items: [] }];
  categories.forEach((category) => {
    const target = columns[0].total <= columns[1].total ? columns[0] : columns[1];
    target.items.push(category);
    target.total += category.count;
  });
  return columns.filter((column) => column.items.length > 0);
}

export default function ProjectCategoryTreemap({ projects = [] }) {
  const categories = useMemo(() => {
    const counts = projects.reduce((result, project) => {
      const category = project.category || 'ไม่ระบุประเภท';
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});
    const total = projects.length;
    return Object.entries(counts)
      .map(([name, count], index) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0, color: TILE_COLORS[index % TILE_COLORS.length] }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [projects]);

  const columns = useMemo(() => makeColumns(categories), [categories]);
  const total = projects.length;

  return (
    <Card className="border-0 shadow-sm category-treemap-card h-100">
      <Card.Header className="bg-white border-bottom py-3 px-3">
        <div className="d-flex align-items-start gap-2">
          <div className="panel-icon-wrap text-primary"><ChartPie size={18} /></div>
          <div>
            <h2 className="panel-title mb-1">Project Category Distribution</h2>
            <p className="small text-muted mb-0">สัดส่วนโปรเจกต์แยกตามประเภท</p>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-3 d-flex flex-column">
        {total === 0 ? (
          <div className="category-treemap-empty text-center d-flex flex-column justify-content-center flex-grow-1">
            <ChartPie size={30} className="mx-auto text-muted mb-2" />
            <span className="fw-semibold text-ink">ยังไม่มีข้อมูลโปรเจกต์</span>
            <span className="small text-muted">เมื่อมีโครงการ ระบบจะแสดงสัดส่วนตามประเภทที่นี่</span>
          </div>
        ) : (
          // ไม่มี legend ใต้ Treemap — รายละเอียดประเภทอยู่ใน tile และ tooltip เมื่อชี้
          <div className="category-treemap" style={{ gridTemplateColumns: columns.map((column) => `${column.total}fr`).join(' ') }}>
            {columns.map((column, columnIndex) => (
              <div className="category-treemap-column" key={`column-${columnIndex}`}>
                {column.items.map((category) => (
                  <div key={category.name} className={`category-treemap-tile ${category.percentage < 10 ? 'category-treemap-tile-compact' : ''}`} style={{ flex: `${category.count} 1 0`, backgroundColor: category.color }} title={`${category.name}: ${category.count} โครงการ (${category.percentage.toFixed(1)}%)`}>
                    <div className="category-tile-content">
                      <span className="category-tile-name">{category.name}</span>
                      <span className="category-tile-detail">{category.count} โครงการ · {category.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

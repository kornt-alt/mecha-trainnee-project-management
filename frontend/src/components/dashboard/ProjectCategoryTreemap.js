// frontend/src/components/dashboard/ProjectCategoryTreemap.js — Treemap แสดงสัดส่วนจำนวนโครงการแยกตามประเภท
// สองโหมดในการ์ดเดียว: Overview (Treemap เดิม) · Category Detail (tabs ประเภทด้านบน + ตารางโปรเจกต์เต็มความกว้าง)
// click segment เพื่อเปิดรายละเอียด · สลับผ่าน tabs · ปุ่ม "กลับไปภาพรวม" เพื่อกลับ Treemap — ไม่มี Drawer/Modal
import React, { useMemo, useState } from 'react';
import { Card, Form, InputGroup, Table, Button } from 'react-bootstrap';
import { ChartPie } from '../common/Icons';
import { statusLabel } from '../../utils/config';
// สี category จากไฟล์กลาง — BudgetBarChart ใช้ไฟล์เดียวกันนี้เพื่อให้กราฟทุกตัวมีสี category ตรงกัน
import { categoryColorByIndex } from '../../utils/categoryColors';

// ArrowLeft (Lucide) — วาด inline ในไฟล์นี้เพราะ common/Icons.js เป็นไฟล์ shared ที่เพื่อนร่วมทีมใช้
const ArrowLeft = ({ size = 18, strokeWidth = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="lucide-icon" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden="true">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

// สี badge ตามความหมายของสถานะจริงในระบบ (config.js PROJECT_STATUSES):
// done=เขียว(เสร็จ) · in_progress=น้ำเงิน(กำลังทำ) · planning=amber(วางแผน/รอเริ่ม) · on_hold=เทา(พักไว้) · cancelled=แดง(ยกเลิก)
const STATUS_BADGE_CLASS = {
  done: 'category-status-done',
  in_progress: 'category-status-in-progress',
  planning: 'category-status-planning',
  on_hold: 'category-status-on-hold',
  cancelled: 'category-status-cancelled',
};

function makeColumns(categories) {
  const columns = [{ total: 0, items: [] }, { total: 0, items: [] }];
  categories.forEach((category) => {
    const target = columns[0].total <= columns[1].total ? columns[0] : columns[1];
    target.items.push(category);
    target.total += category.count;
  });
  return columns.filter((column) => column.items.length > 0);
}

// คืน null เมื่อไม่มีวันที่จริง — แยกกรณีค่าว่างออกจากกรณีมีวันที่ให้ format
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ProjectCategoryTreemap({ projects = [] }) {
  // hover แบบ name เดียว (ไม่ใช้ :hover ล้วน เพราะ tooltip ต้องรู้ว่า tile ไหนถูกชี้)
  const [hoveredName, setHoveredName] = useState(null);
  // selected = ประเภทที่เปิด Detail Mode · null = Overview Mode · เก็บเป็น name ตามที่ Treemap จับกลุ่ม
  const [selectedName, setSelectedName] = useState(null);
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const counts = projects.reduce((result, project) => {
      const category = project.category || 'ไม่ระบุประเภท';
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});
    const total = projects.length;
    return Object.entries(counts)
      .map(([name, count], index) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0, color: categoryColorByIndex(index) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [projects]);

  const columns = useMemo(() => makeColumns(categories), [categories]);
  const total = projects.length;
  const selectedCategory = categories.find((category) => category.name === selectedName) ?? null;

  // โปรเจกต์เฉพาะประเภทที่เลือก (ไม่แก้ array ต้นทาง) แล้วค่อยกรองด้วยคำค้น — trim + ไม่สนตัวพิมพ์
  const categoryProjects = useMemo(
    () => (selectedName ? projects.filter((p) => (p.category || 'ไม่ระบุประเภท') === selectedName) : []),
    [projects, selectedName],
  );
  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categoryProjects;
    return categoryProjects.filter((p) => p.name?.toLowerCase().includes(keyword));
  }, [categoryProjects, search]);

  // เปลี่ยนประเภท (จาก segment หรือ tab) — ล้างคำค้นเพื่อไม่ให้ผลลัพธ์ของประเภทใหม่โดนคำค้นเก่า
  const openCategory = (name) => {
    setSelectedName(name);
    setSearch('');
  };
  const backToOverview = () => {
    setSelectedName(null);
    setSearch('');
  };

  if (total === 0) {
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
          <div className="category-treemap-empty text-center d-flex flex-column justify-content-center flex-grow-1">
            <ChartPie size={30} className="mx-auto text-muted mb-2" />
            <span className="fw-semibold text-ink">ยังไม่มีข้อมูลโปรเจกต์</span>
            <span className="small text-muted">เมื่อมีโครงการ ระบบจะแสดงสัดส่วนตามประเภทที่นี่</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

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
        {selectedCategory ? (
          // ── Category Detail Mode: tabs ประเภทด้านบน + ตารางโปรเจกต์เต็มความกว้าง (ไม่มี segment อื่นในพื้นที่เนื้อหา) ──
          <div className="category-detail">
            {/* แถวบน: ปุ่มย้อนกลับ (ไอคอนอย่างเดียว) ชิดซ้ายสุด ตามด้วย tabs — ปุ่มกลับเป็น leading control ของ header */}
            <div className="category-detail-top">
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                className="category-back-btn"
                onClick={backToOverview}
                aria-label="กลับไปภาพรวมประเภทโปรเจกต์"
                title="กลับไปภาพรวม"
              >
                <ArrowLeft size={16} />
              </Button>
              <div className="category-tabs" role="tablist" aria-label="เลือกประเภทโปรเจกต์">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    role="tab"
                    aria-selected={category.name === selectedName}
                    className={`category-tab ${category.name === selectedName ? 'category-tab-active' : ''}`}
                    style={category.name === selectedName ? { backgroundColor: category.color, borderColor: category.color } : undefined}
                    onClick={() => openCategory(category.name)}
                  >
                    {category.name} <span className="category-tab-count">{category.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* heading ใช้สีประเภทจริงจาก TILE_COLORS เดียวกับ segment ใน Treemap — ข้อความขาวอ่านชัดบนพื้นสีกลาง-เข้มทั้งชุด */}
            <div className="category-detail-header" style={{ backgroundColor: selectedCategory.color }}>
              <h3 className="category-detail-title">
                {selectedCategory.name}
              </h3>
              <span className="category-detail-count">{selectedCategory.count} โครงการ · {selectedCategory.percentage.toFixed(1)}%</span>
            </div>

            <Form onSubmit={(e) => e.preventDefault()} role="search" className="category-detail-search">
              <Form.Label htmlFor="category-detail-search-input" className="visually-hidden">ค้นหาโปรเจกต์</Form.Label>
              <InputGroup size="sm">
                <Form.Control
                  id="category-detail-search-input"
                  type="search"
                  placeholder="ค้นหาโปรเจกต์ในประเภทนี้…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <Button variant="outline-secondary" onClick={() => setSearch('')} aria-label="ล้างคำค้นหา">
                    ล้าง
                  </Button>
                )}
              </InputGroup>
            </Form>

            {/* scroll ภายในการ์ดเท่านั้น — ตารางกินความกว้างเต็มพื้นที่ เลื่อนแนวนอนเฉพาะเมื่อจอแคบจริง */}
            <div className="category-detail-scroll">
              {categoryProjects.length === 0 ? (
                <div className="category-detail-empty">ไม่มีโปรเจกต์ในประเภทนี้</div>
              ) : filteredProjects.length === 0 ? (
                <div className="category-detail-empty">ไม่พบโปรเจกต์ที่ตรงกับคำค้นหา — ลองใช้คำอื่น หรือกด "ล้าง" เพื่อดูทั้งหมด</div>
              ) : (
                <Table hover size="sm" className="align-middle mb-0 category-detail-table">
                  <thead>
                    <tr>
                      <th scope="col">ชื่อโปรเจกต์</th>
                      <th scope="col" className="text-nowrap">สถานะ</th>
                      <th scope="col" className="text-nowrap">กำหนดส่ง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <tr key={p.id ?? p.name}>
                        <td className="category-detail-name">{p.name}</td>
                        <td className="text-nowrap"><span className={`badge category-detail-status ${STATUS_BADGE_CLASS[p.status] ?? 'category-status-on-hold'}`}>{statusLabel(p.status)}</span></td>
                        <td className="text-nowrap">{formatDate(p.dueDate) ?? <span className="text-muted">ไม่ระบุ</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          // ── Overview Mode: Treemap เดิม — click segment เพื่อเปิด Detail Mode ──
          // ไม่มี legend ใต้ Treemap — รายละเอียดประเภทอยู่ใน tile และ tooltip เมื่อชี้
          <div className="category-treemap" style={{ gridTemplateColumns: columns.map((column) => `${column.total}fr`).join(' ') }}>
            {columns.map((column, columnIndex) => (
              <div className="category-treemap-column" key={`column-${columnIndex}`}>
                {column.items.map((category) => {
                  const isHovered = hoveredName === category.name;
                  return (
                    // tooltip เป็น child ของ tile (position absolute) เพื่อไม่กระทบ layout
                    <div
                      key={category.name}
                      className={`category-treemap-tile ${category.percentage < 10 ? 'category-treemap-tile-compact' : ''} ${isHovered ? 'category-treemap-tile-hover' : ''}`}
                      style={{ flex: `${category.count} 1 0`, backgroundColor: category.color }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${category.name} ${category.count} โครงการ ${category.percentage.toFixed(1)}% — คลิกเพื่อดูรายการโปรเจกต์`}
                      onMouseEnter={() => setHoveredName(category.name)}
                      onMouseLeave={() => setHoveredName((current) => (current === category.name ? null : current))}
                      onFocus={() => setHoveredName(category.name)}
                      onBlur={() => setHoveredName((current) => (current === category.name ? null : current))}
                      onClick={() => openCategory(category.name)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(category.name); } }}
                    >
                      <div className="category-tile-content">
                        <span className="category-tile-name">{category.name}</span>
                        <span className="category-tile-detail">{category.count} โครงการ · {category.percentage.toFixed(1)}%</span>
                      </div>
                      {isHovered && (
                        <div className="category-treemap-tooltip" role="tooltip">
                          <span className="category-treemap-tooltip-name">{category.name}</span>
                          <span>{category.count} โครงการ · {category.percentage.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

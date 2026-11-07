import React, { useState } from 'react';
import { Badge, Modal, Row, Col, Table } from 'react-bootstrap';
import { MOCK_PROJECTS, MOCK_TASKS } from '../data/mockData';
import { getAssignmentStatusLabel } from '../data/workloadMatrixData';


// Utility formatters (Thai style for consistency with Workload chart)
const fmtHours = (hours) => `${Number(hours || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`;
const fmtPercent = (util) => (util === null || util === undefined ? 'N/A' : `${Math.round(util)}%`);

const PRIORITY_ORDER = { urgent: 4, high: 3, normal: 2, low: 1 };
const PRIORITY_META = {
  urgent: { label: 'Urgent', bg: 'danger' },
  high: { label: 'High', bg: 'warning' },
  normal: { label: 'Normal', bg: 'primary' },
  low: { label: 'Low', bg: 'secondary' },
};

/**
 * Shared Employee Detail Modal used by both the Workload chart and the 6‑month matrix.
 *
 * Props:
 *   show      – boolean to control visibility
 *   onHide    – callback to close the modal
 *   employee  – employee object (required)
 *   range     – optional { start, end } for chart timeframe
 *   period    – optional string identifier for timeframe (e.g. 'monthly')
 *   cell      – optional matrix cell data (when opened from the matrix)
 */
export default function EmployeeDetailModal({ show, onHide, employee, range, period, cell }) {
  const [sortKey, setSortKey] = useState('workload');
  const [sortDirection, setSortDirection] = useState('desc');

  if (!employee) return null;

  // ==== Data preparation ====================================================
  // When a matrix cell is supplied we use its calculations; otherwise we fall back to the employee's aggregated values.
  const totalWorkload = cell ? Number(cell.plannedHours || 0) : Number(employee.plannedHours || 0);
  const actualCapacity = cell ? Number(cell.capacityHours || 0) : Number(employee.capacityHours || 0);
  const utilization = actualCapacity > 0 ? (totalWorkload / actualCapacity) * 100 : null;

  // Status badge based on utilization thresholds (same logic as existing components)
  let statusLabel = 'Available';
  let statusBadgeBg = 'success';
  let statusColorClass = 'text-success';
  if (actualCapacity <= 0 || utilization === null) {
    statusLabel = 'N/A';
    statusBadgeBg = 'secondary';
    statusColorClass = 'text-secondary';
  } else if (utilization >= 100) {
    statusLabel = 'Overcapacity';
    statusBadgeBg = 'danger';
    statusColorClass = 'text-danger';
  } else if (utilization >= 90) {
    statusLabel = 'Near Capacity';
    statusBadgeBg = 'warning';
    statusColorClass = 'text-warning';
  }

  // Project/assignment breakdown – source differs between chart and matrix.
  // Chart: employee.entries (pre‑computed); Matrix: cell.contributing.
  const projectMap = new Map();
  if (cell) {
    // Matrix mode – use cell.contributing [{assignment, hours}]
    cell.contributing.forEach(({ assignment, hours }) => {
      const hasProject = assignment.projectId != null;
      const pId = hasProject ? assignment.projectId : 'unassigned';
      if (!projectMap.has(pId)) {
        const project = hasProject ? (MOCK_PROJECTS || []).find(p => p.id === assignment.projectId) : null;
        projectMap.set(pId, {
          id: pId,
          name: project ? project.name : (hasProject ? `Project #${assignment.projectId}` : 'Unassigned Tasks'),
          dueDate: project ? project.dueDate : null,
          workload: 0,
          taskIds: new Set(),
        });
      }
      const entry = projectMap.get(pId);
      entry.workload += Number(hours || 0);
      if (assignment.taskId) entry.taskIds.add(assignment.taskId);
    });
  } else {
    // Chart mode – use employee.entries array.
    const entries = Array.isArray(employee.entries) ? employee.entries : [];
    entries.forEach(entry => {
      const hasProject = entry.projectId != null;
      const pId = hasProject ? entry.projectId : 'unassigned';
      if (!projectMap.has(pId)) {
        const project = hasProject ? (MOCK_PROJECTS || []).find(p => p.id === entry.projectId) : null;
        projectMap.set(pId, {
          id: pId,
          name: project ? project.name : (hasProject ? `Project #${entry.projectId}` : 'Unassigned Tasks'),
          dueDate: project ? project.dueDate : null,
          workload: 0,
          taskIds: new Set(),
        });
      }
      const item = projectMap.get(pId);
      item.workload += Number(entry.hours || 0);
      if (entry.taskId) item.taskIds.add(entry.taskId);
    });
  }

  const projectRows = Array.from(projectMap.values()).map(p => {
    const tasks = Array.from(p.taskIds)
      .map(id => (MOCK_TASKS || []).find(t => t.id === id))
      .filter(Boolean);
    const priorities = [...new Set(tasks.map(t => t.priority).filter(Boolean))];
    let priorityLabel = '—';
    let priorityVariant = 'secondary';
    let priorityTitle = '';
    let priorityRank = 0;
    if (priorities.length === 1) {
      const meta = PRIORITY_META[priorities[0]];
      priorityLabel = meta ? meta.label : priorities[0];
      priorityVariant = meta ? meta.bg : 'secondary';
      priorityRank = PRIORITY_ORDER[priorities[0]] || 0;
    } else if (priorities.length > 1) {
      const highest = priorities.reduce((prev, cur) => ((PRIORITY_ORDER[cur] || 0) > (PRIORITY_ORDER[prev] || 0) ? cur : prev), priorities[0]);
      const meta = PRIORITY_META[highest];
      priorityLabel = meta ? meta.label : highest;
      priorityVariant = meta ? meta.bg : 'secondary';
      priorityRank = PRIORITY_ORDER[highest] || 0;
      priorityTitle = `Contributing priorities: ${priorities.map(pr => PRIORITY_META[pr]?.label || pr).join(', ')}`;
    }
    const percentOfCapacity = actualCapacity > 0 ? (p.workload / actualCapacity) * 100 : null;
    return {
      id: p.id,
      name: p.name,
      dueDate: p.dueDate,
      workload: p.workload,
      priorityLabel,
      priorityVariant,
      priorityTitle,
      priorityRank,
      percentOfCapacity,
    };
  });

  const sortedRows = projectRows.sort((a, b) => {
    let compare = 0;
    if (sortKey === 'project') {
      compare = a.name.localeCompare(b.name);
    } else if (sortKey === 'workload') {
      compare = a.workload - b.workload;
    } else if (sortKey === 'percent') {
      compare = (a.percentOfCapacity || 0) - (b.percentOfCapacity || 0);
    }
    return sortDirection === 'asc' ? compare : -compare;
  });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'project' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return <span className="text-muted ms-1" style={{ opacity: 0.35 }}>↕</span>;
    return <span className="ms-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  // Section / Sub‑section display (fallback to available fields)
  const section = employee.section || employee.department || '—';
  const subSection = employee.subSection || employee.sub_section || employee.role || employee.position || '—';

  // ==== Rendering ==========================================================
  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="workload-detail-modal">
      <Modal.Header closeButton className="workload-detail-modal-header border-bottom">
        <div className="w-100 pe-3">
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <Modal.Title as="h5" className="fw-bold mb-0 text-dark">
              {employee.name}{employee.nickname ? ` (${employee.nickname})` : ''}
            </Modal.Title>
            <span className="text-muted small">
              {employee.position || '—'} · {employee.department || '—'}
            </span>
          </div>
          <div className="workload-modal-meta text-muted small mt-1">
            <span><strong>ID:</strong> {employee.id || '—'}</span>
            <span className="mx-2">|</span>
            <span><strong>Section:</strong> {section}</span>
            <span className="mx-2">|</span>
            <span><strong>Sub Section:</strong> {subSection}</span>
            {range && (
              <>
                <span className="mx-2">|</span>
                <span><strong>Timeframe:</strong> {range.start} – {range.end}</span>
              </>
            )}
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4">
        {/* Summary KPIs */}
        <Row className="g-3 mb-4">
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="workload-modal-kpi-label">Total Workload</div>
              <div className="workload-modal-kpi-value text-primary">
                {totalWorkload.toFixed(1)} <small>hrs</small>
              </div>
            </div>
          </Col>
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="workload-modal-kpi-label">Capacity</div>
              <div className="workload-modal-kpi-value text-dark">
                {actualCapacity.toFixed(1)} <small>hrs</small>
              </div>
            </div>
          </Col>
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="d-flex align-items-center justify-content-between">
                <div className="workload-modal-kpi-label">Utilization</div>
                <Badge bg={statusBadgeBg}>{statusLabel}</Badge>
              </div>
              <div className={`workload-modal-kpi-value ${statusColorClass}`}>
                {actualCapacity > 0 ? `${utilization.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
          </Col>
        </Row>

        {/* Capacity notes – show matrix‑specific breakdown if available */}
        {cell && (
          <div className="workload-detail-capacity-note mb-3">
            ตารางงานพื้นฐาน {fmtHours(cell.capacity.baseScheduleHours)} ·
            หักวันหยุดนักขัตฤกษ์ {fmtHours(cell.capacity.holidayHours)} ·
            หักการลาที่อนุมัติ {fmtHours(cell.capacity.leaveHours)}
          </div>
        )}

        <h6 className="fw-bold mb-2">Project Workload Breakdown</h6>
        <div className="table-responsive workload-modal-table-wrap">
          <Table hover size="sm" className="align-middle workload-modal-table mb-0">
            <thead>
              <tr>
                <th role="button" tabIndex={0} className="workload-modal-sort-th" onClick={() => handleSort('project')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSort('project'); }}>
                  Project {renderSortIcon('project')}
                </th>
                <th>Status</th>
                <th>Period</th>
                <th className="text-end">Hours (this month)</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td><Badge bg={row.priorityVariant}>{row.priorityLabel}</Badge></td>
                  <td className="text-nowrap">{row.dueDate || '—'}</td>
                  <td className="text-end text-nowrap">{fmtHours(row.workload)}</td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">ไม่มีการมอบหมายงานในเดือนนี้</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  );
}

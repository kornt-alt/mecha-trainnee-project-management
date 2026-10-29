// frontend/src/components/BudgetBarChart/BudgetBarChart.js
// Side-by-side stacked bar chart (planned vs actual budget per category), custom SVG, no chart library.
import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { ChartNoAxesColumn } from '../common/Icons';
import { STATUS_OPTIONS, VIEW_MODE_OPTIONS, RANGE_OPTIONS } from './budgetBarChartData';
import {
  ALL_STATUSES,
  VIEW_MODES,
  buildChartModel,
  filterCategories,
  getTooltipPosition,
} from './budgetBarChartUtils';
import './budgetBarChart.css';

const EMPTY_CATEGORIES = [];

const getSegmentClassName = (segment, hoveredProjectKey) =>
  [
    'budget-bar-chart__segment',
    segment.searchState !== 'idle' ? `budget-bar-chart__segment--${segment.searchState}` : '',
    // the planned and actual segments of the hovered project light up together
    hoveredProjectKey === segment.projectKey ? 'budget-bar-chart__segment--linked' : '',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * @param {Array} categories  [{ id, name, projects: [{ id, name, planned, actual, status, manager,
 *                            plannedColor, actualColor }] }]  (see buildBudgetCategories for flat rows)
 * @param {Array} [statusOptions]       [{ value, label }] for the status dropdown and tooltip
 * @param {string|number|null} [selectedCategoryId]  show only this category (controlled by the parent)
 * @param {function} [onReset]          called after the reset button clears the chart's own filters
 * @param {number} [rangeValue]         selected historical range in months (1/2/3/6/9/12)
 * @param {function} [onRangeChange]    called with the newly selected range in months
 * @param {string} [rangeNotice]        Thai notice shown when the requested range exceeds available data
 * @param {string} [className]          extra class for the Card
 */
const BudgetBarChart = ({
  categories = EMPTY_CATEGORIES,
  statusOptions = STATUS_OPTIONS,
  selectedCategoryId = null,
  onReset,
  rangeValue,
  onRangeChange,
  rangeNotice,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState(VIEW_MODES.COMPARISON);
  const [status, setStatus] = useState(ALL_STATUSES);
  const [searchText, setSearchText] = useState('');
  const [tooltip, setTooltip] = useState(null); // { content, position }
  const [hoveredProjectKey, setHoveredProjectKey] = useState(null);

  // Recompute only when data or filters change; theme and resize are handled by CSS / viewBox.
  const filtered = useMemo(
    () => filterCategories(categories, { status, searchText, selectedCategoryId }),
    [categories, status, searchText, selectedCategoryId],
  );

  const statusLabels = useMemo(
    () => Object.fromEntries(statusOptions.map((option) => [option.value, option.label])),
    [statusOptions],
  );

  const model = useMemo(
    () => buildChartModel(filtered.categories, { viewMode, keyword: filtered.keyword, statusLabels }),
    [filtered, viewMode, statusLabels],
  );

  const hideTooltip = () => {
    setTooltip(null);
    setHoveredProjectKey(null);
  };

  const getTooltipHandlers = (content, projectKey = null) => ({
    onMouseEnter: (event) => {
      setHoveredProjectKey(projectKey);
      setTooltip({
        content,
        position: getTooltipPosition(event.clientX, event.clientY, window.innerWidth, window.innerHeight),
      });
    },
    onMouseMove: (event) => {
      const position = getTooltipPosition(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
      setTooltip((previous) => (previous ? { ...previous, position } : previous));
    },
    onMouseLeave: hideTooltip,
  });

  const handleReset = () => {
    setViewMode(VIEW_MODES.COMPARISON);
    setStatus(ALL_STATUSES);
    setSearchText('');
    hideTooltip();
    if (onReset) onReset();
  };

  const clearSearch = () => setSearchText('');

  const renderBar = (bar) => {
    if (bar.kind === 'variance') {
      return (
        <g key={bar.key}>
          <rect
            className="budget-bar-chart__segment"
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={4}
            style={{ fill: bar.color }}
            {...getTooltipHandlers(bar.tooltip)}
          />
          <text
            className="budget-bar-chart__variance-label"
            x={bar.centerX}
            y={bar.labelY}
            textAnchor="middle"
            style={{ fill: bar.color }}
          >
            {bar.valueText}
          </text>
        </g>
      );
    }

    return (
      <g key={bar.key}>
        {bar.segments.map((segment) => (
          <React.Fragment key={segment.key}>
            <rect
              className={getSegmentClassName(segment, hoveredProjectKey)}
              x={bar.x}
              y={segment.y}
              width={bar.width}
              height={segment.height}
              rx={3}
              style={{ fill: segment.color }}
              {...getTooltipHandlers(segment.tooltip, segment.projectKey)}
            />
            {segment.showLabel && (
              <text
                className="budget-bar-chart__segment-label"
                x={bar.centerX}
                y={segment.y + segment.height / 2 + 4}
                textAnchor="middle"
              >
                {segment.shareText}
              </text>
            )}
          </React.Fragment>
        ))}

        {/* เส้นขอบรอบแท่งซ้อน (Outer Outline) วาดซ้อนทับหลังสุดเพื่อให้ขอบบนและโครงสร้างแท่งคมชัด ไม่ถูกทับ */}
        <rect
          className="budget-bar-chart__bar-outline"
          x={bar.x}
          y={bar.topY}
          width={bar.width}
          height={bar.totalHeight}
          rx={3}
          fill="none"
          pointerEvents="none"
        />

        {/* หากมีเซกเมนต์ในแท่งนี้ถูก hover ให้วาดเส้นขอบไฮไลต์ทับบนสุดเพื่อไม่ให้เซกเมนต์ที่อยู่ติดกันบังขอบ */}
        {bar.segments.map((segment) => {
          if (hoveredProjectKey !== segment.projectKey) return null;
          return (
            <rect
              key={`highlight-${segment.key}`}
              className="budget-bar-chart__segment-highlight"
              x={bar.x}
              y={segment.y}
              width={bar.width}
              height={segment.height}
              rx={3}
              fill="none"
              pointerEvents="none"
            />
          );
        })}

        {/* Total badge above the bar: blue for planned, dark for actual */}
        <g className={`budget-bar-chart__badge budget-bar-chart__badge--${bar.kind}`}>
          <rect
            x={bar.centerX - bar.badge.width / 2}
            y={bar.badge.y}
            width={bar.badge.width}
            height={bar.badge.height}
            rx={5}
          />
          <text x={bar.centerX} y={bar.badge.y + 12} textAnchor="middle">
            {bar.badge.text}
          </text>
        </g>
      </g>
    );
  };

  const { plot } = model;

  return (
    <Card className={`budget-bar-chart ${className}`.trim()}>
      <Card.Header className="budget-bar-chart__header">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <ChartNoAxesColumn size={18} />
            </div>
            <div>
              <h2 className="panel-title mb-0">การวิเคราะห์เปรียบเทียบงบประมาณตามหมวดหมู่</h2>
              <p className="small text-muted mb-0">
                เปรียบเทียบงบประมาณวางแผน (Planned) และค่าใช้จ่ายจริง (Actual) รายโครงการย่อย
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge cost-mock-badge">ข้อมูลจำลอง (Mock Data)</span>
          </div>
        </div>

        <div className="budget-bar-chart__toolbar">
          <div className="budget-bar-chart__modes" role="group" aria-label="โหมดการแสดงผล">
            {VIEW_MODE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="light"
                size="sm"
                aria-pressed={viewMode === option.value}
                className={`budget-bar-chart__mode${viewMode === option.value ? ' budget-bar-chart__mode--active' : ''}`}
                onClick={() => setViewMode(option.value)}
              >
                {option.swatch && (
                  <span className={`budget-bar-chart__swatch budget-bar-chart__swatch--${option.swatch}`} />
                )}
                {option.label}
              </Button>
            ))}
          </div>

          <div className="budget-bar-chart__filters">
            {/* ตัวกรองช่วงเวลาย้อนหลัง — คุมหน้าต่าง cost record ที่นับเป็น "ค่าใช้จ่ายจริง" */}
            {rangeValue !== undefined && onRangeChange && (
              <Form.Select
                size="sm"
                className="budget-bar-chart__range"
                aria-label="เลือกช่วงเวลาย้อนหลัง"
                value={rangeValue}
                onChange={(event) => onRangeChange(Number(event.target.value))}
              >
                {RANGE_OPTIONS.map((option) => {
                  const val = typeof option === 'object' ? option.value : option;
                  const lbl = typeof option === 'object' ? option.label : `${val} เดือนย้อนหลัง`;
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  );
                })}
              </Form.Select>
            )}

          <Form.Select
            size="sm"
            className="budget-bar-chart__status"
            aria-label="กรองตามสถานะโครงการ"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value={ALL_STATUSES}>ทุกสถานะโครงการ (All Statuses)</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>

          <Form.Control
            size="sm"
            type="search"
            className="budget-bar-chart__search"
            aria-label="ค้นหาโปรเจกต์"
            placeholder="ค้นชื่อโปรเจกต์ ผู้ดูแล หรือรหัส..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />

          <Button variant="outline-secondary" size="sm" onClick={handleReset}>
            รีเซ็ต
          </Button>
        </div>
      </div>
    </Card.Header>

      <Card.Body className="budget-bar-chart__body">
        {rangeNotice && (
          <Alert variant="warning" className="budget-bar-chart__notice">
            <span>{rangeNotice}</span>
          </Alert>
        )}

        {filtered.keyword && (
          <Alert variant="info" className="budget-bar-chart__notice">
            <span>
              กำลังไฮไลต์โปรเจกต์ย่อยที่ตรงกับ: <strong>&quot;{searchText.trim()}&quot;</strong>
            </span>
            <Button variant="link" size="sm" className="p-0" onClick={clearSearch}>
              ล้างคำค้นหา
            </Button>
          </Alert>
        )}

        {filtered.projectCount === 0 ? (
          <div className="budget-bar-chart__empty" role="status">
            <p className="budget-bar-chart__empty-title">ไม่พบโครงการย่อยที่ตรงตามเงื่อนไข</p>
            <p className="budget-bar-chart__empty-hint">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะ</p>
            <Button variant="link" size="sm" onClick={handleReset}>
              รีเซ็ตตัวกรองทั้งหมด
            </Button>
          </div>
        ) : (
          <div className="budget-bar-chart__scroll">
            <svg
              className="budget-bar-chart__svg"
              viewBox={`0 0 ${model.width} ${model.height}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ minWidth: model.minRenderWidth }}
              role="img"
              aria-label="กราฟแท่งเปรียบเทียบงบประมาณตามหมวดหมู่"
            >
              {model.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    className="budget-bar-chart__grid"
                    x1={plot.left}
                    x2={plot.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text className="budget-bar-chart__tick-label" x={plot.left - 10} y={tick.y + 4} textAnchor="end">
                    {tick.label}
                  </text>
                </g>
              ))}

              <line
                className="budget-bar-chart__baseline"
                x1={plot.left}
                x2={plot.right}
                y1={model.zeroY}
                y2={model.zeroY}
              />

              {model.groups.map((group) => (
                <g key={group.id}>
                  <text className="budget-bar-chart__category-label" x={group.centerX} y={plot.bottom + 22} textAnchor="middle">
                    {group.name}
                  </text>
                  <text className="budget-bar-chart__category-count" x={group.centerX} y={plot.bottom + 38} textAnchor="middle">
                    ({group.projectCount} โปรเจกต์)
                  </text>
                  {group.bars.map(renderBar)}
                </g>
              ))}
            </svg>
          </div>
        )}

        <div className="budget-bar-chart__legend">
          <span className="budget-bar-chart__legend-item">
            <span className="budget-bar-chart__swatch budget-bar-chart__swatch--planned" />
            แท่งซ้าย (งบวางแผน): โทนสีสว่าง / สดใส
          </span>
          <span className="budget-bar-chart__legend-item">
            <span className="budget-bar-chart__swatch budget-bar-chart__swatch--actual" />
            แท่งขวา (ค่าใช้จ่ายจริง): โทนสีเข้ม (Darker Shade)
          </span>
        </div>
      </Card.Body>

      {tooltip && (
        <div
          className="budget-bar-chart__tooltip"
          role="tooltip"
          style={{ left: tooltip.position.left, top: tooltip.position.top }}
        >
          <div className="budget-bar-chart__tooltip-title">
            <span>{tooltip.content.title}</span>
            {tooltip.content.code && <span className="budget-bar-chart__tooltip-code">{tooltip.content.code}</span>}
          </div>
          <div>
            หมวดหมู่: <strong>{tooltip.content.categoryName}</strong>
          </div>
          <div>
            ประเภทข้อมูล: <span className="budget-bar-chart__tooltip-metric">{tooltip.content.metricLabel}</span>
          </div>
          <div>
            มูลค่าสุทธิ: <strong className="budget-bar-chart__tooltip-amount">{tooltip.content.amountText}</strong>
            {tooltip.content.shareText && ` (${tooltip.content.shareText} ของหมวด)`}
          </div>
          {tooltip.content.manager && <div>ผู้ดูแล: {tooltip.content.manager}</div>}
          {tooltip.content.statusLabel && <div>สถานะ: <strong>{tooltip.content.statusLabel}</strong></div>}
        </div>
      )}
    </Card>
  );
};

export default BudgetBarChart;

// frontend/src/components/DonutChart/DonutChart.js
// Custom-SVG donut chart with external connector labels and slice <-> label hover linking.
// Converted from the Vue 3 dashboard (project_status_dashboard_donut_chart.html) to React hooks.
import React, { useCallback, useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import { ChartPie } from '../common/Icons';
import { buildDonutChartModel, createResponsiveGeometry } from './donutChartUtils';
import useElementWidth from './useElementWidth';
import './donutChart.css';

const EMPTY_ITEMS = [];

/**
 * @param {Array<{id: string|number, label: string, count: number, color: string}>} items
 * @param {string} [title]          card title
 * @param {string} [subtitle]       small text under the title
 * @param {string} [centerLabel]    text under the total in the hole
 * @param {string} [countUnit]      unit shown after each count
 * @param {string} [emptyMessage]   message when the total is 0
 * @param {string|number|null} [hoveredId]  pass to control hover from outside (e.g. summary cards)
 * @param {function} [onHoverChange] called with the hovered id, or null
 * @param {boolean} [animated]      play the slice entrance animation
 * @param {object} [geometry]       result of createChartGeometry() for a fixed size;
 *                                  omitted = auto-fit to the measured container width
 * @param {string} [className]      extra class for the Card
 */
const DonutChart = ({
  items = EMPTY_ITEMS,
  title = 'สถานะโปรเจกต์',
  subtitle = '',
  centerLabel = 'โปรเจกต์ทั้งหมด',
  countUnit = 'โปรเจกต์',
  emptyMessage = 'ไม่มีข้อมูลโปรเจกต์',
  hoveredId,
  onHoverChange,
  animated = true,
  geometry: geometryProp,
  className = '',
}) => {
  // วัดความกว้างจริงของพื้นที่วาด เพื่อสร้าง geometry ที่ข้อความเรนเดอร์ขนาดจริง (ดู useElementWidth)
  const [measureRef, containerWidth] = useElementWidth();

  // Recalculate only when the data (or size) changes -> chart updates instantly with new props.
  const geometry = useMemo(
    () => geometryProp || createResponsiveGeometry(containerWidth),
    [geometryProp, containerWidth],
  );
  const model = useMemo(() => buildDonutChartModel(items, geometry), [items, geometry]);

  // ป้ายแคบ (คอลัมน์แคบ) → ย่อฟอนต์/padding ของ label box ผ่าน modifier class
  const isCompact = geometry.labelWidth < 110;

  // Uncontrolled by default; becomes controlled when the parent passes hoveredId.
  const [internalHoveredId, setInternalHoveredId] = useState(null);
  const isControlled = hoveredId !== undefined;
  const requestedId = isControlled ? hoveredId : internalHoveredId;

  // If the hovered item just dropped to 0 (slice hidden), treat it as "nothing hovered"
  // so the remaining slices are not stuck dimmed.
  const activeId = model.slices.some((slice) => slice.id === requestedId) ? requestedId : null;

  const handleHover = useCallback(
    (id) => {
      if (!isControlled) setInternalHoveredId(id);
      if (onHoverChange) onHoverChange(id);
    },
    [isControlled, onHoverChange],
  );

  const getState = (id) => {
    if (activeId === null) return 'idle';
    return id === activeId ? 'active' : 'dimmed';
  };

  const hoverHandlers = (id) => ({
    onMouseEnter: () => handleHover(id),
    onMouseLeave: () => handleHover(null),
    onFocus: () => handleHover(id),
    onBlur: () => handleHover(null),
  });

  const chartClassName = [
    'donut-chart',
    'side-panel-card',
    'h-100',
    animated ? 'donut-chart--animated' : '',
    isCompact ? 'donut-chart--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card className={chartClassName}>
      {/* header ต้องหน้าตาเหมือนการ์ดกราฟอื่นของ Dashboard (ไอคอน + panel-title) */}
      <Card.Header className="donut-chart__header bg-white border-bottom py-3 px-3">
        <div className="d-flex align-items-center gap-2">
          <div className="panel-icon-wrap text-primary">
            <ChartPie size={18} />
          </div>
          <div>
            <h3 className="panel-title mb-0">{title}</h3>
            {subtitle && <p className="donut-chart__subtitle">{subtitle}</p>}
          </div>
        </div>
      </Card.Header>

      <Card.Body className="donut-chart__body p-3 d-flex flex-column justify-content-center">
        {/* เปลือกวัดขนาด — กว้างเต็มพื้นที่การ์ดเสมอ ไม่ว่าเนื้อหาข้างในจะกว้างเท่าไร */}
        <div ref={measureRef} className="donut-chart__measure">
          {model.slices.length === 0 ? (
            <div className="donut-chart__empty" role="status">
              {emptyMessage}
            </div>
          ) : (
            <svg
              className="donut-chart__svg"
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`${title}: ${centerLabel} ${model.total}`}
            >
              {/* Slices + center text. Slice paths are drawn around (0,0), so move to the center. */}
              <g transform={`translate(${geometry.centerX}, ${geometry.centerY})`}>
                {model.slices.map((slice, index) => (
                  <path
                    key={`slice-${slice.id}`}
                    d={slice.path}
                    style={{ fill: slice.color, '--slice-delay': `${index * 80}ms` }}
                    className={`donut-chart__slice donut-chart__slice--${getState(slice.id)}`}
                    tabIndex={0}
                    {...hoverHandlers(slice.id)}
                  >
                    <title>{`${slice.label}: ${slice.count} ${countUnit} (${slice.percentageText}%)`}</title>
                  </path>
                ))}

                <g className="donut-chart__center" textAnchor="middle" pointerEvents="none">
                  <text className="donut-chart__center-value" y={-6}>
                    {model.total.toLocaleString()}
                  </text>
                  <text className="donut-chart__center-label" y={24}>
                    {centerLabel}
                  </text>
                </g>
              </g>

              {/* Connector lines + external labels (drawn after the slices so they sit on top). */}
              {model.slices.map((slice) => {
                const state = getState(slice.id);
                const isActive = state === 'active';

                return (
                  <g
                    key={`callout-${slice.id}`}
                    className={`donut-chart__callout donut-chart__callout--${state}`}
                    tabIndex={0}
                    {...hoverHandlers(slice.id)}
                  >
                    <path
                      d={slice.connectorPath}
                      fill="none"
                      style={{ stroke: slice.color }}
                      strokeWidth={isActive ? 2.5 : 1.75}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="donut-chart__connector"
                    />
                    <circle cx={slice.anchor.x} cy={slice.anchor.y} r={3.5} style={{ fill: slice.color }} />
                    <circle cx={slice.labelAnchor.x} cy={slice.labelAnchor.y} r={2.5} style={{ fill: slice.color }} />

                    <foreignObject
                      x={slice.labelBox.x}
                      y={slice.labelBox.y}
                      width={slice.labelBox.width}
                      height={slice.labelBox.height}
                      className="donut-chart__label-wrapper"
                    >
                      <div
                        className={`donut-chart__label${isActive ? ' donut-chart__label--active' : ''}`}
                        style={{ '--slice-color': slice.color }}
                      >
                        <div className="donut-chart__label-title">
                          <span className="donut-chart__label-dot" />
                          <span className="donut-chart__label-name" title={slice.label}>
                            {slice.label}
                          </span>
                        </div>
                        <div className="donut-chart__label-meta">
                          <span className="donut-chart__label-count">
                            {slice.count} {countUnit}
                          </span>
                          <span className="donut-chart__label-percent">{slice.percentageText}%</span>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default DonutChart;

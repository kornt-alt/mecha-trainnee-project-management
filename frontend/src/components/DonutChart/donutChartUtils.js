// frontend/src/components/DonutChart/donutChartUtils.js
// Pure calculation helpers for DonutChart (no React, no DOM) so they stay easy to test and reuse.

const FULL_CIRCLE = 2 * Math.PI;

// SVG angle 0 points at 3 o'clock; shifting by -90° makes the first slice start at 12 o'clock.
const START_ANGLE = -Math.PI / 2;

// A 360° slice has identical start/end points, so the SVG arc would draw nothing.
// Trimming a tiny amount (~0.01px at r=135) keeps a single 100% slice visible.
const FULL_CIRCLE_EPSILON = 0.0001;

export const DEFAULT_SLICE_COLOR = '#64748B';

/**
 * Build the chart geometry. All coordinates live in the SVG viewBox space.
 * Label anchors are derived from the radii so connector lines always point outward.
 */
export const createChartGeometry = (overrides = {}) => {
  const geometry = {
    width: 760,
    height: 520,
    centerX: 380,
    centerY: 260,
    outerRadius: 135,
    innerRadius: 92, // donut hole
    elbowOffset: 30, // distance from the ring to the bend of the connector
    labelWidth: 170,
    labelHeight: 48,
    labelGap: 8, // space between the connector end and the label box
    labelMinSpacing: 52, // minimum vertical distance between label centers
    labelEdgePadding: 4, // keep labels this far from the top/bottom edge
    ...overrides,
  };

  // Anchors sit just beyond the farthest elbow point (outerRadius + elbowOffset).
  const anchorDistance = geometry.outerRadius + geometry.elbowOffset + 5;

  return {
    rightAnchorX: geometry.centerX + anchorDistance,
    leftAnchorX: geometry.centerX - anchorDistance,
    ...geometry,
  };
};

export const DEFAULT_CHART_GEOMETRY = createChartGeometry();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Geometry tuned to the measured container width.
 * The SVG viewBox equals the rendered width so CSS-px text (foreignObject labels)
 * renders 1:1 instead of shrinking with the viewBox — the dashboard card column is
 * much narrower than the 760px default, which would make labels unreadably small.
 * The ring gets whatever width the two label columns leave over.
 */
export const createResponsiveGeometry = (containerWidth) => {
  const width = Math.max(Math.round(containerWidth) || DEFAULT_CHART_GEOMETRY.width, 220);
  const scale = clamp(width / 760, 0.3, 1);

  const labelWidth = Math.round(clamp(170 * scale, 64, 170));
  const labelHeight = Math.round(clamp(48 * scale, 32, 48));
  const labelGap = Math.round(clamp(8 * scale, 4, 8));
  const labelMinSpacing = Math.round(clamp(52 * scale, 36, 52));
  const labelEdgePadding = 4;

  // Per-side budget: half the width minus the label column and its gap.
  const sideBudget = width / 2 - labelGap - labelWidth - 5;
  let elbowOffset = Math.round(clamp(30 * scale, 6, 30));
  let outerRadius = Math.round(clamp(135 * scale, 34, sideBudget - elbowOffset));
  if (outerRadius + elbowOffset > sideBudget) {
    // Extremely narrow container: shrink the elbow before giving up on the ring.
    elbowOffset = Math.max(4, sideBudget - outerRadius);
  }

  // Height must hold `labelMinSpacing` rows for up to 5 labels plus breathing room.
  const height = Math.max(
    Math.round(width * 0.68),
    labelMinSpacing * 4 + labelHeight * 2 + 40,
  );

  return createChartGeometry({
    width,
    height,
    centerX: Math.round(width / 2),
    centerY: Math.round(height / 2),
    outerRadius,
    innerRadius: Math.round(outerRadius * 0.68),
    elbowOffset,
    labelWidth,
    labelHeight,
    labelGap,
    labelMinSpacing,
    labelEdgePadding,
  });
};

/** Accept only finite numbers > 0; NaN, Infinity, negatives, null, '' and text become 0. */
export const sanitizeCount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/**
 * Clean up raw input without mutating it: drop non-objects, make ids unique
 * (React keys and hover matching depend on it), and sanitize counts.
 */
export const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];

  const usedIds = new Set();

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      let id = item.id ?? `item-${index}`;
      if (usedIds.has(id)) id = `${id}-${index}`;
      usedIds.add(id);

      return {
        id,
        label: String(item.label ?? id),
        color: item.color || DEFAULT_SLICE_COLOR,
        count: sanitizeCount(item.count),
      };
    });
};

export const calculateTotal = (items) =>
  Array.isArray(items)
    ? items.reduce((sum, item) => sum + sanitizeCount(item?.count), 0)
    : 0;

/** Returns 0–100. Returns 0 (never NaN/Infinity) when the total is 0. */
export const calculatePercentage = (count, total) => {
  const safeTotal = sanitizeCount(total);
  if (safeTotal === 0) return 0;
  return (sanitizeCount(count) / safeTotal) * 100;
};

export const formatPercentage = (value, digits = 1) =>
  (Number.isFinite(value) ? value : 0).toFixed(digits);

/** Share (0–100) of the item whose id equals `completedId`; 0 when missing or total is 0. */
export const calculateCompletionRate = (items, completedId = 'completed') => {
  const normalizedItems = normalizeItems(items);
  const total = calculateTotal(normalizedItems);
  const completedItem = normalizedItems.find((item) => item.id === completedId);
  return completedItem ? calculatePercentage(completedItem.count, total) : 0;
};

/** Point on a circle: x = cx + r·cos(θ), y = cy + r·sin(θ). */
export const polarToCartesian = (centerX, centerY, radius, angle) => ({
  x: centerX + radius * Math.cos(angle),
  y: centerY + radius * Math.sin(angle),
});

const formatCoordinate = (value) => value.toFixed(2);

/**
 * Path of one ring slice, drawn around (0, 0) (the component translates the group to the center).
 * Outer arc runs clockwise (sweep=1), inner arc returns counter-clockwise (sweep=0).
 */
export const describeDonutSlicePath = (outerRadius, innerRadius, startAngle, endAngle) => {
  const angleSpan = Math.min(endAngle - startAngle, FULL_CIRCLE - FULL_CIRCLE_EPSILON);
  const safeEndAngle = startAngle + angleSpan;
  // large-arc-flag must be 1 when the arc is longer than half a circle.
  const largeArcFlag = angleSpan > Math.PI ? 1 : 0;

  const outerStart = polarToCartesian(0, 0, outerRadius, startAngle);
  const outerEnd = polarToCartesian(0, 0, outerRadius, safeEndAngle);
  const innerEnd = polarToCartesian(0, 0, innerRadius, safeEndAngle);
  const innerStart = polarToCartesian(0, 0, innerRadius, startAngle);

  return [
    `M ${formatCoordinate(outerStart.x)} ${formatCoordinate(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${formatCoordinate(outerEnd.x)} ${formatCoordinate(outerEnd.y)}`,
    `L ${formatCoordinate(innerEnd.x)} ${formatCoordinate(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${formatCoordinate(innerStart.x)} ${formatCoordinate(innerStart.y)}`,
    'Z',
  ].join(' ');
};

/**
 * Label collision avoidance for one side of the chart.
 * 1. Sort by the ideal Y (where the connector would naturally end).
 * 2. Push labels down so neighbours keep `minSpacing`.
 * 3. If the last label falls below `maxY`, pin it there and pull the others up.
 * If there are too many labels for the space, the spacing shrinks evenly instead of overflowing.
 */
export const spreadLabelsVertically = (entries, minY, maxY, minSpacing) => {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.idealY - b.idealY);
  const lastIndex = sorted.length - 1;

  const spacing = lastIndex > 0
    ? Math.min(minSpacing, (maxY - minY) / lastIndex)
    : minSpacing;

  const positions = sorted.map((entry) => Math.min(Math.max(entry.idealY, minY), maxY));

  for (let i = 1; i <= lastIndex; i += 1) {
    positions[i] = Math.max(positions[i], positions[i - 1] + spacing);
  }

  if (positions[lastIndex] > maxY) {
    positions[lastIndex] = maxY;
    for (let i = lastIndex - 1; i >= 0; i -= 1) {
      positions[i] = Math.min(positions[i], positions[i + 1] - spacing);
    }
  }

  return sorted.map((entry, i) => ({ ...entry, labelY: positions[i] }));
};

/**
 * Everything the component needs to render, computed from raw items:
 * - total:  sum of valid counts
 * - items:  all normalized items with percentage (zero-count ones included, for summaries)
 * - slices: only items with count > 0, with arc path, connector path and label box
 */
export const buildDonutChartModel = (rawItems, geometry = DEFAULT_CHART_GEOMETRY) => {
  const items = normalizeItems(rawItems);
  const total = calculateTotal(items);

  const itemsWithShare = items.map((item) => {
    const percentage = calculatePercentage(item.count, total);
    return { ...item, percentage, percentageText: formatPercentage(percentage) };
  });

  if (total <= 0) return { total: 0, items: itemsWithShare, slices: [] };

  const {
    centerX, centerY, outerRadius, innerRadius, elbowOffset,
    labelWidth, labelHeight, labelGap, labelMinSpacing, labelEdgePadding,
    leftAnchorX, rightAnchorX, height,
  } = geometry;

  let currentAngle = START_ANGLE;

  const drawnSlices = itemsWithShare
    .filter((item) => item.count > 0) // hide zero slices
    .map((item) => {
      const angleSpan = (item.count / total) * FULL_CIRCLE;
      const startAngle = currentAngle;
      const endAngle = startAngle + angleSpan;
      const midAngle = startAngle + angleSpan / 2;
      currentAngle = endAngle;

      // anchor = dot on the ring edge, elbow = bend point further out along the same ray.
      const anchor = polarToCartesian(centerX, centerY, outerRadius, midAngle);
      const elbow = polarToCartesian(centerX, centerY, outerRadius + elbowOffset, midAngle);

      return {
        ...item,
        startAngle,
        endAngle,
        midAngle,
        isRight: Math.cos(midAngle) >= 0, // right half of the chart -> label on the right
        path: describeDonutSlicePath(outerRadius, innerRadius, startAngle, endAngle),
        anchor,
        elbow,
        idealY: elbow.y,
      };
    });

  // Left and right labels are laid out independently, each within the vertical bounds.
  const minY = labelHeight / 2 + labelEdgePadding;
  const maxY = height - minY;
  const labelYById = new Map();

  [true, false].forEach((isRightSide) => {
    const sideSlices = drawnSlices.filter((slice) => slice.isRight === isRightSide);
    spreadLabelsVertically(sideSlices, minY, maxY, labelMinSpacing).forEach((slice) => {
      labelYById.set(slice.id, slice.labelY);
    });
  });

  const slices = drawnSlices.map((slice) => {
    const labelAnchor = {
      x: slice.isRight ? rightAnchorX : leftAnchorX,
      y: labelYById.get(slice.id),
    };

    const labelBox = {
      x: slice.isRight ? labelAnchor.x + labelGap : labelAnchor.x - labelGap - labelWidth,
      y: labelAnchor.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    };

    // Elbow connector: ring surface -> bend point -> label anchor.
    const connectorPath = [
      `M ${slice.anchor.x.toFixed(1)} ${slice.anchor.y.toFixed(1)}`,
      `L ${slice.elbow.x.toFixed(1)} ${slice.elbow.y.toFixed(1)}`,
      `L ${labelAnchor.x.toFixed(1)} ${labelAnchor.y.toFixed(1)}`,
    ].join(' ');

    return { ...slice, labelAnchor, labelBox, connectorPath };
  });

  return { total, items: itemsWithShare, slices };
};

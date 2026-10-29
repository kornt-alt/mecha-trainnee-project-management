// frontend/src/components/BudgetBarChart/budgetBarChartUtils.js
// Pure calculation/filter/layout helpers for BudgetBarChart — ported from the reference
// project_budget_analysis_dashboard.html (renderSVGChart + applyFilters) with no React/DOM access.

export const VIEW_MODES = {
  COMPARISON: 'comparison',
  PLANNED: 'planned',
  ACTUAL: 'actual',
  VARIANCE: 'variance',
};

export const ALL_STATUSES = 'ALL';

const MARGIN = { top: 50, right: 20, bottom: 65, left: 70 };
const CHART_HEIGHT = 460;

/** ฿1,234,567 style, Thai locale, no decimals (sample money values are whole baht). */
export const formatCurrency = (value) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })
    .format(Number(value) || 0);

/** Compact axis/badge format: ฿1.25M / ฿450k / ฿800. */
export const formatShortCurrency = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000) return `฿${(amount / 1000000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1000) return `฿${Math.round(amount / 1000)}k`;
  return `฿${Math.round(amount)}`;
};

/** Keep the fixed-position tooltip inside the viewport (component follows the pointer). */
export const getTooltipPosition = (clientX, clientY, viewportWidth, viewportHeight) => {
  const tooltipWidth = 240;
  const tooltipHeight = 210;
  let left = clientX + 15;
  if (left + tooltipWidth > viewportWidth - 8) left = clientX - tooltipWidth - 15;
  let top = clientY - 20;
  if (top + tooltipHeight > viewportHeight - 8) top = viewportHeight - tooltipHeight - 8;
  return { left: Math.max(8, left), top: Math.max(8, top) };
};

/**
 * Apply the toolbar filters without mutating the input.
 * Categories with zero matching projects are kept (their label still renders, like the reference).
 */
export const filterCategories = (categories, { status = ALL_STATUSES, searchText = '', selectedCategoryId = null }) => {
  const keyword = String(searchText || '').trim().toLowerCase();
  const source = Array.isArray(categories) ? categories : [];

  const filtered = source.map((category) => {
    const projects = (category?.projects || []).filter((project) => {
      const matchStatus = status === ALL_STATUSES || project.status === status;
      const matchCategory = !selectedCategoryId || category.id === selectedCategoryId;
      const haystack = `${project.name} ${project.id} ${project.manager ?? ''} ${category.name}`.toLowerCase();
      const matchSearch = !keyword || haystack.includes(keyword);
      return matchStatus && matchCategory && matchSearch;
    });
    return { ...category, projects };
  });

  return {
    categories: filtered,
    keyword,
    projectCount: filtered.reduce((sum, category) => sum + category.projects.length, 0),
  };
};

const buildTooltip = (project, categoryName, metricLabel, value, sharePct, statusLabels) => ({
  title: project.name,
  code: String(project.id),
  categoryName,
  metricLabel,
  amountText: formatCurrency(value),
  shareText: `${sharePct}%`,
  manager: project.manager || '',
  statusLabel: statusLabels[project.status] || project.status,
});

/**
 * Build everything the SVG needs. Coordinates live in the viewBox space;
 * `minRenderWidth` keeps the scroll container from squishing narrow layouts.
 */
export const buildChartModel = (categories, { viewMode, keyword = '', statusLabels = {} }) => {
  const width = Math.max(760, categories.length * 240 + 110);
  const margin = MARGIN;
  const plot = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: CHART_HEIGHT - margin.bottom,
  };
  const chartWidth = plot.right - plot.left;
  const chartHeight = plot.bottom - plot.top;
  const zeroY = plot.bottom;
  const groupWidth = chartWidth / Math.max(categories.length, 1);

  const totalsByCategory = categories.map((category) => {
    const plannedTotal = category.projects.reduce((sum, p) => sum + (Number(p.planned) || 0), 0);
    const actualTotal = category.projects.reduce((sum, p) => sum + (Number(p.actual) || 0), 0);
    return { plannedTotal, actualTotal, varianceTotal: plannedTotal - actualTotal };
  });

  // Y scale: the tallest visible metric + 18% headroom for the total badges.
  let maxY = 0;
  totalsByCategory.forEach((totals) => {
    if (viewMode === VIEW_MODES.COMPARISON || viewMode === VIEW_MODES.PLANNED) {
      maxY = Math.max(maxY, totals.plannedTotal);
    }
    if (viewMode === VIEW_MODES.COMPARISON || viewMode === VIEW_MODES.ACTUAL) {
      maxY = Math.max(maxY, totals.actualTotal);
    }
    if (viewMode === VIEW_MODES.VARIANCE) maxY = Math.max(maxY, Math.abs(totals.varianceTotal));
  });
  if (maxY === 0) maxY = 1000000;
  maxY *= 1.18;

  const ticks = Array.from({ length: 6 }, (_, index) => {
    const value = (maxY / 5) * index;
    return { value, y: zeroY - (value / maxY) * chartHeight, label: formatShortCurrency(value) };
  });

  const toY = (value) => zeroY - (value / maxY) * chartHeight;

  // Search highlight applies to name/id matches (same rule as the reference).
  const searchStateOf = (project) => {
    if (!keyword) return 'idle';
    const haystack = `${project.name} ${project.id}`.toLowerCase();
    return haystack.includes(keyword) ? 'match' : 'dimmed';
  };

  const buildStackBar = (category, totals, kind) => {
    if (totals[kind === 'planned' ? 'plannedTotal' : 'actualTotal'] <= 0) return null;
    const isPlanned = kind === 'planned';
    const total = isPlanned ? totals.plannedTotal : totals.actualTotal;
    if (!Number.isFinite(total) || total <= 0) return null;

    // กรองและคำนวณสัดส่วนของแต่ละโครงการเทียบกับยอดรวมของแท่งนี้โดยไม่แก้ไข category.projects เดิม
    const validProjects = (category.projects || []).filter((project) => {
      const value = Number(isPlanned ? project.planned : project.actual);
      return Number.isFinite(value) && value > 0;
    });

    if (validProjects.length === 0) return null;

    const preparedItems = validProjects.map((project) => {
      const value = Number(isPlanned ? project.planned : project.actual);
      const sharePct = Number(((value / total) * 100).toFixed(1));
      return { project, value, sharePct };
    });

    // เรียงลำดับจากเปอร์เซ็นต์มากไปน้อย (Descending)
    // โดยโครงการที่มีสัดส่วนมากที่สุดจะอยู่ที่ฐานล่างสุดของแท่ง (เริ่มจาก zeroY)
    // และลดหลั่นขึ้นไปจนถึงโครงการที่มีสัดส่วนน้อยที่สุดอยู่บนสุด
    // พร้อมกำหนด tie-breaker ที่แน่นอน (deterministic) เมื่อมีสัดส่วนเท่ากัน
    preparedItems.sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      return String(a.project.id).localeCompare(String(b.project.id), 'en', { numeric: true });
    });

    const segments = [];
    let currentY = zeroY;
    preparedItems.forEach(({ project, value, sharePct }) => {
      const segmentHeight = (value / maxY) * chartHeight;
      const segmentY = currentY - segmentHeight;
      currentY = segmentY;

      segments.push({
        key: `${kind}-${project.id}`,
        projectKey: String(project.id),
        y: segmentY,
        height: segmentHeight,
        color: isPlanned ? project.plannedColor : project.actualColor,
        searchState: searchStateOf(project),
        showLabel: segmentHeight > 18,
        shareText: `${sharePct}%`,
        sharePct,
        value,
        tooltip: buildTooltip(
          project,
          category.name,
          isPlanned ? 'งบวางแผน (Planned)' : 'ค่าใช้จ่ายจริง (Actual)',
          value,
          sharePct,
          statusLabels,
        ),
      });
    });

    const totalHeight = zeroY - currentY;
    const topY = currentY;

    return {
      key: `${category.id}-${kind}`,
      kind,
      x: 0, // filled in by the caller (depends on the side-by-side layout)
      width: 0,
      centerX: 0,
      topY,
      totalHeight,
      segments,
      badge: {
        width: 0,
        height: 18,
        y: toY(total) - 24,
        text: formatShortCurrency(total),
      },
    };
  };

  const groups = categories.map((category, index) => {
    const totals = totalsByCategory[index];
    const groupX = plot.left + index * groupWidth;
    const centerX = groupX + groupWidth / 2;
    const bars = [];

    if (viewMode === VIEW_MODES.COMPARISON) {
      const barWidth = Math.min(groupWidth * 0.32, 42);
      const gapBetweenBars = 6;
      const plannedBar = buildStackBar(category, totals, 'planned');
      const actualBar = buildStackBar(category, totals, 'actual');
      if (plannedBar) {
        bars.push({
          ...plannedBar,
          x: centerX - barWidth - gapBetweenBars / 2,
          width: barWidth,
          centerX: centerX - barWidth / 2 - gapBetweenBars / 2,
          badge: { ...plannedBar.badge, width: barWidth + 12 },
        });
      }
      if (actualBar) {
        bars.push({
          ...actualBar,
          x: centerX + gapBetweenBars / 2,
          width: barWidth,
          centerX: centerX + barWidth / 2 + gapBetweenBars / 2,
          badge: { ...actualBar.badge, width: barWidth + 12 },
        });
      }
    } else if (viewMode === VIEW_MODES.PLANNED || viewMode === VIEW_MODES.ACTUAL) {
      const barWidth = Math.min(groupWidth * 0.45, 55);
      const kind = viewMode === VIEW_MODES.PLANNED ? 'planned' : 'actual';
      const bar = buildStackBar(category, totals, kind);
      if (bar) {
        bars.push({
          ...bar,
          x: centerX - barWidth / 2,
          width: barWidth,
          centerX,
          badge: { ...bar.badge, width: barWidth + 8 },
        });
      }
    } else if (viewMode === VIEW_MODES.VARIANCE) {
      const barWidth = Math.min(groupWidth * 0.45, 55);
      const variance = totals.varianceTotal;
      const isPositive = variance >= 0;
      const barHeight = (Math.abs(variance) / maxY) * chartHeight;
      if (Math.abs(variance) > 0) {
        bars.push({
          key: `${category.id}-variance`,
          kind: 'variance',
          x: centerX - barWidth / 2,
          y: zeroY - barHeight,
          width: barWidth,
          height: barHeight,
          centerX,
          color: isPositive ? '#10B981' : '#F43F5E',
          valueText: `${isPositive ? '+' : ''}${formatShortCurrency(variance)}`,
          labelY: zeroY - barHeight - 8,
          tooltip: {
            title: `หมวดหมู่: ${category.name}`,
            code: '',
            categoryName: category.name,
            metricLabel: 'ผลต่างสุทธิ (Variance)',
            amountText: formatCurrency(variance),
            shareText: '',
            manager: '',
            statusLabel: '',
          },
        });
      }
    }

    return {
      id: category.id,
      name: category.name,
      centerX,
      projectCount: category.projects.length,
      bars,
    };
  });

  return {
    width,
    height: CHART_HEIGHT,
    minRenderWidth: width,
    plot,
    zeroY,
    ticks,
    groups,
  };
};

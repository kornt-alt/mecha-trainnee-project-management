// Shared list filtering, pagination, and Thai date formatting for notification center pages.
export function filterAndPaginate(records, options = {}) {
  const {
    search = '',
    searchFields = [],
    filters = {},
    page = 1,
    pageSize = 10,
  } = options;
  const query = String(search).trim().toLocaleLowerCase('th');
  const filteredItems = records.filter((record) => {
    const matchesSearch = !query || searchFields.some((field) => String(record[field] ?? '').toLocaleLowerCase('th').includes(query));
    const matchesFilters = Object.entries(filters).every(([field, value]) => (
      value === '' || value === null || value === undefined || String(record[field] ?? '').toLocaleLowerCase('th') === String(value).toLocaleLowerCase('th')
    ));
    return matchesSearch && matchesFilters;
  });
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const pageCount = Math.ceil(filteredItems.length / safePageSize);
  const currentPage = pageCount ? Math.min(Math.max(1, Number(page) || 1), pageCount) : 1;
  const start = (currentPage - 1) * safePageSize;

  return {
    filteredItems,
    items: filteredItems.slice(start, start + safePageSize),
    totalItems: filteredItems.length,
    pageCount,
    
    currentPage,
  };
}

export function formatThaiDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(date);
}

export function updateSearchParams(current, updates) {
  const next = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) next.delete(key);
    else next.set(key, String(value));
  });
  return next;
}

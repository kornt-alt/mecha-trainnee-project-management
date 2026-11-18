// Tests for the notification center's shared list filtering and pagination rules.
import { filterAndPaginate } from './notificationCenterUtils';

const records = [
  { id: 'N-1', title: 'Access review required', priority: 'urgent', status: 'unread' },
  { id: 'N-2', title: 'Project update', priority: 'normal', status: 'read' },
  { id: 'N-3', title: 'Access review completed', priority: 'high', status: 'unread' },
];

describe('filterAndPaginate', () => {
  it('searches text, applies multiple filters, and paginates the result', () => {
    const result = filterAndPaginate(records, {
      search: 'access',
      searchFields: ['title'],
      filters: { status: 'unread' },
      page: 1,
      pageSize: 1,
    });

    expect(result.filteredItems.map((item) => item.id)).toEqual(['N-1', 'N-3']);
    expect(result.items.map((item) => item.id)).toEqual(['N-1']);
    expect(result.totalItems).toBe(2);
    expect(result.pageCount).toBe(2);
  });

  it('clamps an out-of-range page and handles an empty result', () => {
    const lastPage = filterAndPaginate(records, { page: 99, pageSize: 2 });
    const empty = filterAndPaginate(records, { search: 'missing', searchFields: ['title'] });

    expect(lastPage.currentPage).toBe(2);
    expect(lastPage.items.map((item) => item.id)).toEqual(['N-3']);
    expect(empty.currentPage).toBe(1);
    expect(empty.pageCount).toBe(0);
    expect(empty.items).toEqual([]);
  });
});

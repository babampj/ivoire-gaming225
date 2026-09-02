export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function pageFromQuery(query: Record<string, unknown>, max = 50) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(max, Math.max(1, Number(query.limit ?? 20) || 20));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PageResult<T> {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
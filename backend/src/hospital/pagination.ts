import { PageQuery } from './hospital.dto';
export function pageArgs(query: PageQuery) { return { skip: (query.page - 1) * query.pageSize, take: query.pageSize }; }
export function pageResult<T>(items: T[], total: number, query: PageQuery) {
  return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
}

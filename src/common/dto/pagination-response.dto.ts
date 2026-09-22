export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  return {
    currentPage: page,
    pageSize: limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}

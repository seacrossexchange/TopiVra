import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationActions {
  /** 跳转到指定页（同时重置到该页） */
  setPage: (page: number) => void;
  /** 更新总条数（从 API 响应中同步） */
  setTotal: (total: number) => void;
  /** 重置回第 1 页 */
  resetPage: () => void;
  /** 修改每页条数，同时重置到第 1 页 */
  setPageSize: (size: number) => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  /** 当前偏移量，可直接用于 skip/offset 参数 */
  offset: number;
  /** 是否还有下一页 */
  hasNextPage: boolean;
  /** 是否有上一页 */
  hasPrevPage: boolean;
}

interface UsePaginationOptions {
  /** 初始页码，默认 1 */
  initialPage?: number;
  /** 初始每页条数，默认 20 */
  initialPageSize?: number;
}

/**
 * usePagination — 统一分页状态管理 Hook
 *
 * @example
 * ```tsx
 * const { page, pageSize, total, setPage, setTotal } = usePagination();
 *
 * const { data } = useQuery({
 *   queryKey: ['products', page, pageSize],
 *   queryFn: async () => {
 *     const res = await productsService.getProducts({ page, limit: pageSize });
 *     setTotal(res.data.total);
 *     return res.data.items;
 *   },
 * });
 *
 * // JSX:
 * // <Pagination current={page} pageSize={pageSize} total={total} onChange={setPage} />
 * ```
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 20 } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotalState] = useState(0);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal);
  }, []);

  const resetPage = useCallback(() => {
    setPageState(initialPage);
  }, [initialPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1); // 修改每页条数时重置到第 1 页
  }, []);

  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    page,
    pageSize,
    total,
    offset,
    hasNextPage,
    hasPrevPage,
    setPage,
    setTotal,
    resetPage,
    setPageSize,
  };
}













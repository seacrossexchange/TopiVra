import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('初始状态正确', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.total).toBe(0);
    expect(result.current.offset).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it('自定义初始值', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, initialPageSize: 50 })
    );

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.offset).toBe(50); // (2-1) * 50
  });

  it('setPage 更新页码', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
    expect(result.current.offset).toBe(40); // (3-1) * 20
  });

  it('setTotal 更新总数并计算分页', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotal(100);
    });

    expect(result.current.total).toBe(100);
    expect(result.current.hasNextPage).toBe(true); // 100 / 20 = 5 页，第1页有下一页
    expect(result.current.hasPrevPage).toBe(false); // 第1页无上一页
  });

  it('setPageSize 修改每页条数并重置到第1页', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
      result.current.setTotal(100);
    });

    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.page).toBe(1); // 重置到第1页
    expect(result.current.pageSize).toBe(50);
  });

  it('resetPage 重置到初始页码', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2 })
    );

    act(() => {
      result.current.setPage(5);
    });

    expect(result.current.page).toBe(5);

    act(() => {
      result.current.resetPage();
    });

    expect(result.current.page).toBe(2);
  });

  it('正确计算 hasNextPage 和 hasPrevPage', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setTotal(100); // 5 页
      result.current.setPage(1);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(true);

    act(() => {
      result.current.setPage(5);
    });

    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(true);
  });

  it('offset 计算正确', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPageSize: 25 })
    );

    act(() => {
      result.current.setPage(1);
    });
    expect(result.current.offset).toBe(0);

    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.offset).toBe(25);

    act(() => {
      result.current.setPage(4);
    });
    expect(result.current.offset).toBe(75);
  });
});













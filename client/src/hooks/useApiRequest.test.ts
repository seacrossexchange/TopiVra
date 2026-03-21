import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiRequest, isRequestCancelled } from './useApiRequest';

describe('useApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide getSignal function', () => {
    const { result } = renderHook(() => useApiRequest());
    
    expect(result.current.getSignal).toBeDefined();
    expect(typeof result.current.getSignal).toBe('function');
  });

  it('should provide cancelAll function', () => {
    const { result } = renderHook(() => useApiRequest());
    
    expect(result.current.cancelAll).toBeDefined();
    expect(typeof result.current.cancelAll).toBe('function');
  });

  it('should create AbortSignal for request', () => {
    const { result } = renderHook(() => useApiRequest());
    
    const signal = result.current.getSignal('test-request');
    
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('should cancel previous request with same key', () => {
    const { result } = renderHook(() => useApiRequest());
    
    const signal1 = result.current.getSignal('test-request');
    const signal2 = result.current.getSignal('test-request');
    
    expect(signal1.aborted).toBe(true);
    expect(signal2.aborted).toBe(false);
  });

  it('should cancel all requests on cancelAll', () => {
    const { result } = renderHook(() => useApiRequest());
    
    const signal1 = result.current.getSignal('request-1');
    const signal2 = result.current.getSignal('request-2');
    
    result.current.cancelAll();
    
    expect(signal1.aborted).toBe(true);
    expect(signal2.aborted).toBe(true);
  });

  it('should cancel all requests on unmount', () => {
    const { result, unmount } = renderHook(() => useApiRequest());
    
    const signal1 = result.current.getSignal('request-1');
    const signal2 = result.current.getSignal('request-2');
    
    unmount();
    
    expect(signal1.aborted).toBe(true);
    expect(signal2.aborted).toBe(true);
  });

  it('should identify cancelled requests', () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    
    expect(isRequestCancelled(abortError)).toBe(true);
  });

  it('should not identify non-cancelled errors', () => {
    const normalError = new Error('Network error');
    
    expect(isRequestCancelled(normalError)).toBe(false);
  });
});





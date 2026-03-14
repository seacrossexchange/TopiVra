/**
 * 性能优化工具集
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * 防抖 Hook
 * @param callback 回调函数
 * @param delay 延迟时间（毫秒）
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 节流 Hook
 * @param callback 回调函数
 * @param delay 延迟时间（毫秒）
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay],
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * 图片懒加载 Hook
 */
export function useLazyImage(src: string): {
  imageSrc: string;
  isLoaded: boolean;
} {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  return { imageSrc, isLoaded };
}

/**
 * 虚拟滚动 Hook
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    renderCountRef.current++;

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTimeRef.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderCount: renderCountRef.current,
          lifetime: `${lifetime.toFixed(2)}ms`,
        });
      }
    };
  }, [componentName]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && renderCountRef.current > 10) {
      console.warn(
        `[Performance Warning] ${componentName} has rendered ${renderCountRef.current} times`,
      );
    }
  });
}

/**
 * 代码分割工具
 */
export const lazyWithRetry = (
  componentImport: () => Promise<any>,
  retries = 3,
  interval = 1000,
) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptImport = (attemptsLeft: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft === 0) {
              reject(error);
              return;
            }

            setTimeout(() => {
              attemptImport(attemptsLeft - 1);
            }, interval);
          });
      };

      attemptImport(retries);
    });
  });
};

/**
 * 预加载资源
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * 资源预取
 */
export function prefetchRoute(route: string) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = route;
  document.head.appendChild(link);
}

/**
 * Web Vitals 监控
 */
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // 发送到分析服务
    console.log(metric);
    
    // 示例：发送到 Google Analytics
    // gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // });
  }
}




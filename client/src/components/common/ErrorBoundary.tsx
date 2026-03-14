import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // 错误已被捕获，在生产环境应上报到 Sentry
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <Result
            status="500"
            title="出错了"
            subTitle={error?.message || '页面发生了一个错误，请刷新页面重试'}
            extra={[
              <Button type="primary" key="retry" onClick={this.handleReset}>
                重试
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
            ]}
          />
        </div>
      );
    }

    return children;
  }
}

/**
 * 全局异步错误监听 Hook
 * 捕获 window.onerror 和 unhandledrejection（React ErrorBoundary 无法捕获这两类）
 */
function useGlobalErrorHandlers() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      if (import.meta.env.DEV) {
        console.error('[GlobalError] 未捕获的脚本错误:', event.error ?? event.message);
      }
      // 生产环境应上报到 Sentry
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // 忽略请求取消导致的 rejection（正常行为）
      const reason = event.reason;
      if (
        reason instanceof Error &&
        (reason.message === 'canceled' || reason.name === 'AbortError' || reason.message === 'duplicate')
      ) {
        return;
      }
      if (import.meta.env.DEV) {
        console.error('[GlobalError] 未处理的 Promise 异常:', reason);
      }
      // 生产环境应上报到 Sentry
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}

// 包装器组件，整合 Class ErrorBoundary + 全局异步错误监听
export default function ErrorBoundary({ children, fallback }: Props) {
  useGlobalErrorHandlers();

  return (
    <ErrorBoundaryClass fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

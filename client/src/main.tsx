import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/rtl.css'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary'

// Sentry 初始化（需要安装 @sentry/react）
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    })
    .catch(() => {
      // @sentry/react not installed, skip
    });
}

// ─── Core Web Vitals 性能监控 ────────────────────────────────────────────────
import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
  const reportMetric = ({ name, value }: { name: string; value: number; id: string }) => {
    // 上报到 Sentry（若已初始化）
    if (SENTRY_DSN) {
      import('@sentry/react').then((Sentry) => {
        // Sentry v8+ uses captureMetric or addMeasurement instead of metrics.set
        // For now, we'll use a custom tag approach
        Sentry.setTag?.(`webvitals.${name}`, value);
      }).catch(() => {});
    }
    // 开发环境输出到控制台
    if (import.meta.env.DEV) {
      console.log(`[WebVitals] ${name}:`, value.toFixed(2));
    }
  };
  onCLS(reportMetric);
  onINP(reportMetric);
  onFCP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}).catch(() => {
  // web-vitals 未安装时静默忽略
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('SW registered:', registration.scope);
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.log('SW registration failed:', error);
        }
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

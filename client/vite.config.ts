import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Sentry source-map 上传插件（生产环境启用）
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: ['./dist/**/*'],
        },
        // 仅在生产构建时上传
        disable: process.env.NODE_ENV !== 'production',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          // 优先使用 docker 环境变量，否则使用 .env 文件，最后默认 localhost:3001
          target: process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('Sending Request to the Target:', req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    build: {
      // 生成 source-map 供 Sentry 使用
      sourcemap: true,
      // 代码分割优化
      rollupOptions: {
        output: {
          manualChunks: {
            // React 核心
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Ant Design（最大的依赖，单独拆分）
            'vendor-antd': ['antd', '@ant-design/icons'],
            // 数据层
            'vendor-query': ['@tanstack/react-query'],
            // 工具库
            'vendor-utils': ['axios', 'dayjs', 'i18next', 'react-i18next'],
            // 表单
            'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // 图表（如有）
            'vendor-charts': ['recharts'],
          },
        },
      },
      // 块大小警告阈值提升到 1MB（antd 本身就很大）
      chunkSizeWarningLimit: 1000,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'test/',
          '**/*.d.ts',
          '**/*.css',
          '**/index.ts',
        ],
      },
    },
  }
})
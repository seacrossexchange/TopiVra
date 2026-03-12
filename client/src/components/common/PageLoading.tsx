import { Spin } from 'antd';
import './PageLoading.css';

interface PageLoadingProps {
  tip?: string;
}

export default function PageLoading({ tip = '加载中...' }: PageLoadingProps) {
  return (
    <div className="page-loading-container">
      <Spin size="large" tip={tip}>
        <div className="page-loading-spinner-content" />
      </Spin>
    </div>
  );
}
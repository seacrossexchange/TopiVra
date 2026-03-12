import { Result, Button } from 'antd';
import './PageError.css';

interface PageErrorProps {
  title?: string;
  subTitle?: string;
  onRetry?: () => void;
}

export default function PageError({ 
  title = '加载失败', 
  subTitle = '请检查网络连接后重试',
  onRetry 
}: PageErrorProps) {
  return (
    <div className="page-error-container">
      <Result
        status="error"
        title={title}
        subTitle={subTitle}
        extra={
          onRetry && (
            <Button type="primary" onClick={onRetry}>
              重试
            </Button>
          )
        }
      />
    </div>
  );
}
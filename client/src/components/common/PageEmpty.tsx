import { Empty, Button } from 'antd';
import { Link } from 'react-router-dom';
import './PageEmpty.css';

interface PageEmptyProps {
  description?: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export default function PageEmpty({ 
  description = '暂无数据',
  actionText,
  actionLink,
  onAction
}: PageEmptyProps) {
  return (
    <div className="page-empty-container">
      <Empty
        description={description}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        {actionText && actionLink && (
          <Link to={actionLink}>
            <Button type="primary">{actionText}</Button>
          </Link>
        )}
        {actionText && onAction && (
          <Button type="primary" onClick={onAction}>{actionText}</Button>
        )}
      </Empty>
    </div>
  );
}
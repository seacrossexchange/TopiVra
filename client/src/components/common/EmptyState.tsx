import { Empty, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  CustomerServiceOutlined,
  HeartOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import './EmptyState.css';

export type EmptyStateType = 'cart' | 'order' | 'product' | 'ticket' | 'favorite' | 'message' | 'search' | 'generic';

interface EmptyStateProps {
  type: EmptyStateType;
  description?: string;
  actionText?: string;
  actionPath?: string;
  onAction?: () => void;
}

/**
 * 增强的空状态组件
 * 提供更友好的用户体验和引导操作
 */
export const EmptyState = ({ 
  type, 
  description, 
  actionText, 
  actionPath,
  onAction 
}: EmptyStateProps) => {
  const navigate = useNavigate();

  const configs: Record<EmptyStateType, {
    icon: React.ReactNode;
    description: string;
    action?: { text: string; path?: string; onClick?: () => void };
  }> = {
    cart: {
      icon: <ShoppingCartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '购物车是空的',
      action: { text: actionText || '去逛逛', path: actionPath || '/products' },
    },
    order: {
      icon: <FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '还没有订单',
      action: { text: actionText || '去购物', path: actionPath || '/products' },
    },
    product: {
      icon: <AppstoreOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '暂无商品',
      action: actionText && actionPath ? { text: actionText, path: actionPath } : undefined,
    },
    ticket: {
      icon: <CustomerServiceOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '暂无工单',
      action: { text: actionText || '创建工单', path: actionPath || '/user/tickets' },
    },
    favorite: {
      icon: <HeartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '还没有收藏',
      action: { text: actionText || '去逛逛', path: actionPath || '/products' },
    },
    message: {
      icon: <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '暂无消息',
      action: undefined,
    },
    search: {
      icon: <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '没有找到相关内容',
      action: { text: actionText || '查看全部', path: actionPath || '/products' },
    },
    generic: {
      icon: <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
      description: description || '暂无数据',
      action: actionText ? { text: actionText, path: actionPath, onClick: onAction } : undefined,
    },
  };

  const config = configs[type];

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (config.action?.onClick) {
      config.action.onClick();
    } else if (config.action?.path) {
      navigate(config.action.path);
    }
  };

  return (
    <div className="empty-state">
      <Empty
        image={config.icon}
        imageStyle={{ height: 80 }}
        description={
          <span className="empty-state__description">
            {config.description}
          </span>
        }
      >
        {config.action && (
          <Button
            type="primary"
            onClick={handleAction}
            className="empty-state__action"
          >
            {config.action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;




































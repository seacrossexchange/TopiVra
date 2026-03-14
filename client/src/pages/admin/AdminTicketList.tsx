import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Input,
  Button,
  Tag,
  Badge,
  Pagination,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  CommentOutlined,
  ShoppingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ticketsService, Ticket } from '@/services/tickets';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './AdminTicketList.css';

dayjs.extend(relativeTime);

export default function AdminTicketList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicketNo, setSelectedTicketNo] = useState<string | null>(null);

  // 获取工单统计
  const { data: stats } = useQuery({
    queryKey: ['ticket-stats', 'admin'],
    queryFn: () => ticketsService.getAdminStats(),
    refetchInterval: 30000,
  });

  // 获取工单列表
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['admin-tickets', currentPage, searchText, typeFilter, statusFilter],
    queryFn: () =>
      ticketsService.getAdminTickets({
        page: currentPage,
        limit: 20,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchText || undefined,
      }),
    refetchInterval: 5000,
  });

  // 获取选中工单详情
  const { data: selectedTicket } = useQuery({
    queryKey: ['ticket', selectedTicketNo],
    queryFn: () => ticketsService.getTicket(selectedTicketNo!),
    enabled: !!selectedTicketNo,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const ticketNo = searchParams.get('ticket');
    if (ticketNo) {
      setSelectedTicketNo(ticketNo);
    } else if (ticketsData?.items?.length > 0) {
      setSelectedTicketNo(ticketsData.items[0].ticket_no);
    }
  }, [searchParams, ticketsData]);

  const handleTicketClick = (ticketNo: string) => {
    setSelectedTicketNo(ticketNo);
    setSearchParams({ ticket: ticketNo });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'REFUND':
        return <ShoppingOutlined />;
      case 'DM':
        return <CommentOutlined />;
      default:
        return <CommentOutlined />;
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      SELLER_REVIEWING: { color: 'processing', text: '卖家审核中' },
      SELLER_AGREED: { color: 'success', text: '卖家已同意' },
      SELLER_REJECTED: { color: 'error', text: '卖家已拒绝' },
      SELLER_OFFERED_REPLACEMENT: { color: 'warning', text: '换货协商中' },
      BUYER_ACCEPTED_REPLACEMENT: { color: 'processing', text: '等待发货' },
      REPLACEMENT_DELIVERED: { color: 'warning', text: '待确认收货' },
      ADMIN_REVIEWING: { color: 'warning', text: '待处理' },
      ADMIN_APPROVED: { color: 'success', text: '已批准' },
      ADMIN_REJECTED: { color: 'error', text: '已拒绝' },
      COMPLETED: { color: 'success', text: '已完成' },
      CLOSED: { color: 'default', text: '已关闭' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  // 判断是否紧急（超过24小时未处理）
  const isUrgent = (ticket: any) => {
    if (ticket.status !== 'ADMIN_REVIEWING') return false;
    const hoursSinceCreated = dayjs().diff(dayjs(ticket.created_at), 'hour');
    return hoursSinceCreated > 24;
  };

  const filteredTickets = ticketsData?.items?.filter((ticket) => {
    if (urgencyFilter === 'urgent') {
      return isUrgent(ticket);
    }
    if (urgencyFilter === 'normal') {
      return !isUrgent(ticket);
    }
    return true;
  });

  return (
    <div className="atc-container">
      <div className="atc-layout">
        {/* 左侧边栏 */}
        <aside className="atc-sidebar is-open">
          {/* 头部 */}
          <div className="atc-sidebar__header">
            <h3>
              <i className="fas fa-shield-alt"></i> 工单管理
            </h3>
          </div>

          {/* 统计面板 */}
          <div className="atc-stats">
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.pending || 0}</span>
              <span className="atc-stat__label">待处理</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.total || 0}</span>
              <span className="atc-stat__label">总数</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.closed || 0}</span>
              <span className="atc-stat__label">已关闭</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.avgResponseTime || '0小时'}</span>
              <span className="atc-stat__label">平均处理</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="atc-sidebar__search">
            <SearchOutlined />
            <input
              type="text"
              placeholder="搜索工单号/主题/用户..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="atc-filters">
            {/* 类型筛选 */}
            <div className="atc-filters__row">
              <button
                className={`atc-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                全部
              </button>
              <button
                className={`atc-filter-btn ${typeFilter === 'REFUND' ? 'active' : ''}`}
                onClick={() => setTypeFilter('REFUND')}
              >
                售后
              </button>
              <button
                className={`atc-filter-btn ${typeFilter === 'DM' ? 'active' : ''}`}
                onClick={() => setTypeFilter('DM')}
              >
                私信
              </button>
            </div>

            {/* 状态筛选 */}
            <div className="atc-filters__row">
              <button
                className={`atc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </button>
              <button
                className={`atc-filter-btn ${statusFilter === 'ADMIN_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ADMIN_REVIEWING')}
              >
                待处理
              </button>
              <button
                className={`atc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_REVIEWING')}
              >
                卖家处理中
              </button>
              <button
                className={`atc-filter-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                已完成
              </button>
              <button
                className={`atc-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CLOSED')}
              >
                已关闭
              </button>
            </div>

            {/* 紧急程度筛选 */}
            <div className="atc-filters__row">
              <button
                className={`atc-filter-btn ${urgencyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setUrgencyFilter('all')}
              >
                全部
              </button>
              <button
                className={`atc-filter-btn ${urgencyFilter === 'urgent' ? 'active' : ''}`}
                onClick={() => setUrgencyFilter('urgent')}
              >
                紧急
              </button>
              <button
                className={`atc-filter-btn ${urgencyFilter === 'normal' ? 'active' : ''}`}
                onClick={() => setUrgencyFilter('normal')}
              >
                正常
              </button>
            </div>
          </div>

          {/* 工单列表 */}
          <div className="atc-sidebar__list">
            {isLoading ? (
              <div className="text-center py-8">
                <Spin />
              </div>
            ) : filteredTickets?.length === 0 ? (
              <Empty description="暂无工单" />
            ) : (
              filteredTickets?.map((ticket) => (
                <div
                  key={ticket.ticket_no}
                  className={`atc-ticket-item ${
                    ticket.unread_admin > 0 ? 'unread' : ''
                  } ${selectedTicketNo === ticket.ticket_no ? 'active' : ''} ${
                    isUrgent(ticket) ? 'urgent' : ''
                  }`}
                  onClick={() => handleTicketClick(ticket.ticket_no)}
                >
                  <div className="atc-ticket-item__icon">
                    {isUrgent(ticket) ? <WarningOutlined /> : getTypeIcon(ticket.type)}
                  </div>
                  <div className="atc-ticket-item__main">
                    <div className="atc-ticket-item__header">
                      <span className="atc-ticket-item__no">#{ticket.ticket_no}</span>
                      {getStatusTag(ticket.status)}
                    </div>
                    <div className="atc-ticket-item__subject">{ticket.subject}</div>
                    <div className="atc-ticket-item__meta">
                      <span className="atc-ticket-item__users">
                        <UserOutlined /> {ticket.buyer_id} ↔ {ticket.seller_id || '无'}
                      </span>
                      <span className="atc-ticket-item__time">
                        {dayjs(ticket.created_at).fromNow()}
                      </span>
                    </div>
                  </div>
                  {ticket.unread_admin > 0 && (
                    <div className="atc-ticket-item__badge">{ticket.unread_admin}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          <div className="atc-pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span>
              {currentPage} / {Math.ceil((ticketsData?.total || 0) / 20)}
            </span>
            <button
              disabled={currentPage >= Math.ceil((ticketsData?.total || 0) / 20)}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </aside>

        {/* 右侧主区域 */}
        <main className="atc-main has-ticket">
          {selectedTicket ? (
            <iframe
              src={`/admin/tickets/${selectedTicketNo}`}
              className="atc-detail-iframe"
              title="工单详情"
            />
          ) : (
            <div className="atc-empty-state">
              <Empty description="请选择一个工单查看详情" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}




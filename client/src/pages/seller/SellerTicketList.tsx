import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Tag,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  CommentOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ticketsService } from '@/services/tickets';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './SellerTicketList.css';

dayjs.extend(relativeTime);

export default function SellerTicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interventionFilter, setInterventionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicketNo, setSelectedTicketNo] = useState<string | null>(null);

  // 获取工单统计
  const { data: stats } = useQuery({
    queryKey: ['ticket-stats', 'seller'],
    queryFn: () => ticketsService.getSellerStats(),
    refetchInterval: 30000,
  });

  // 获取工单列表
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['seller-tickets', currentPage, searchText, typeFilter, statusFilter],
    queryFn: () =>
      ticketsService.getSellerTickets({
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
    // 仅同步 URL 中的 ticketNo → state，避免 effect 内做“自动选择”导致级联 render 警告
    const ticketNo = searchParams.get('ticket');
    if (ticketNo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTicketNo(ticketNo);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedTicketNo && ticketsData?.items?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTicketNo(ticketsData.items[0].ticket_no);
      setSearchParams({ ticket: ticketsData.items[0].ticket_no });
    }
  }, [selectedTicketNo, ticketsData, setSearchParams]);

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
      SELLER_REVIEWING: { color: 'processing', text: '待回复' },
      SELLER_AGREED: { color: 'success', text: '已同意' },
      SELLER_REJECTED: { color: 'error', text: '已拒绝' },
      SELLER_OFFERED_REPLACEMENT: { color: 'warning', text: '已提供换货' },
      ADMIN_REVIEWING: { color: 'warning', text: '客服审核中' },
      COMPLETED: { color: 'success', text: '已完成' },
      CLOSED: { color: 'default', text: '已关闭' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const filteredTickets = ticketsData?.items?.filter((ticket: any) => {
    if (interventionFilter === 'intervened') {
      return ticket.status === 'ADMIN_REVIEWING';
    }
    if (interventionFilter === 'not_intervened') {
      return ticket.status !== 'ADMIN_REVIEWING';
    }
    return true;
  });

  return (
    <div className="stc-container">
      <div className="stc-layout">
        {/* 左侧边栏 */}
        <aside className="stc-sidebar is-open">
          {/* 头部 */}
          <div className="stc-sidebar__header">
            <h3>
              <i className="fas fa-headset"></i> 工单中心
            </h3>
          </div>

          {/* 统计面板 */}
          <div className="stc-stats">
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.pending || 0}</span>
              <span className="stc-stat__label">待处理</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.total || 0}</span>
              <span className="stc-stat__label">总数</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.closed || 0}</span>
              <span className="stc-stat__label">已关闭</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.avgResponseTime || '0小时'}</span>
              <span className="stc-stat__label">平均回复</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="stc-sidebar__search">
            <SearchOutlined />
            <input
              type="text"
              placeholder="搜索工单号/主题/买家..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="stc-filters">
            {/* 类型筛选 */}
            <div className="stc-filters__row">
              <button
                className={`stc-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                全部
              </button>
              <button
                className={`stc-filter-btn ${typeFilter === 'REFUND' ? 'active' : ''}`}
                onClick={() => setTypeFilter('REFUND')}
              >
                售后
              </button>
              <button
                className={`stc-filter-btn ${typeFilter === 'DM' ? 'active' : ''}`}
                onClick={() => setTypeFilter('DM')}
              >
                私信
              </button>
            </div>

            {/* 状态筛选 */}
            <div className="stc-filters__row">
              <button
                className={`stc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </button>
              <button
                className={`stc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_REVIEWING')}
              >
                待处理
              </button>
              <button
                className={`stc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_REVIEWING')}
              >
                待回复
              </button>
              <button
                className={`stc-filter-btn ${statusFilter === 'SELLER_AGREED,SELLER_OFFERED_REPLACEMENT' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_AGREED,SELLER_OFFERED_REPLACEMENT')}
              >
                已回复
              </button>
              <button
                className={`stc-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CLOSED')}
              >
                已关闭
              </button>
            </div>

            {/* 平台介入筛选 */}
            <div className="stc-filters__row">
              <button
                className={`stc-filter-btn ${interventionFilter === 'all' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('all')}
              >
                全部
              </button>
              <button
                className={`stc-filter-btn ${interventionFilter === 'intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('intervened')}
              >
                已介入
              </button>
              <button
                className={`stc-filter-btn ${interventionFilter === 'not_intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('not_intervened')}
              >
                未介入
              </button>
            </div>
          </div>

          {/* 工单列表 */}
          <div className="stc-sidebar__list">
            {isLoading ? (
              <div className="text-center py-8">
                <Spin />
              </div>
            ) : filteredTickets?.length === 0 ? (
              <Empty description="暂无工单" />
            ) : (
              filteredTickets?.map((ticket: any) => (
                <div
                  key={ticket.ticket_no}
                  className={`stc-ticket-item ${
                    ticket.unread_seller > 0 ? 'unread' : ''
                  } ${selectedTicketNo === ticket.ticket_no ? 'active' : ''}`}
                  onClick={() => handleTicketClick(ticket.ticket_no)}
                >
                  <div className="stc-ticket-item__icon">
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div className="stc-ticket-item__main">
                    <div className="stc-ticket-item__header">
                      <span className="stc-ticket-item__no">#{ticket.ticket_no}</span>
                      {getStatusTag(ticket.status)}
                    </div>
                    <div className="stc-ticket-item__subject">{ticket.subject}</div>
                    <div className="stc-ticket-item__meta">
                      <span className="stc-ticket-item__buyer">
                        <UserOutlined /> {ticket.buyer_id}
                      </span>
                      <span className="stc-ticket-item__time">
                        {dayjs(ticket.created_at).fromNow()}
                      </span>
                    </div>
                  </div>
                  {ticket.unread_seller > 0 && (
                    <div className="stc-ticket-item__badge">{ticket.unread_seller}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          <div className="stc-pagination">
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
        <main className="stc-main has-ticket">
          {selectedTicket ? (
            <iframe
              src={`/seller/tickets/${selectedTicketNo}`}
              className="stc-detail-iframe"
              title="工单详情"
            />
          ) : (
            <div className="stc-empty-state">
              <Empty description="请选择一个工单查看详情" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}







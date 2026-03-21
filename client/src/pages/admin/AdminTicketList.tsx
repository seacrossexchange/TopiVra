import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  CommentOutlined,
  ShoppingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ticketsService } from '@/services/tickets';
import { useI18n } from '@/hooks/useI18n';
import dayjs from 'dayjs';
import './AdminTicketList.css';

export default function AdminTicketList() {
  const { t } = useTranslation();
  const { formatRelativeTime } = useI18n();
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
    queryFn: () => ticketsService.getAdminTickets(ticketQuery),
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

  const adminTicketStatuses: Record<string, { color: string; text: string }> = {
    SELLER_REVIEWING: { color: 'processing', text: t('ticket.sellerReviewing', '卖家审核中') },
    SELLER_AGREED: { color: 'success', text: t('ticket.sellerAgreed', '卖家已同意') },
    SELLER_REJECTED: { color: 'error', text: t('ticket.sellerRejected', '卖家已拒绝') },
    SELLER_OFFERED_REPLACEMENT: { color: 'warning', text: t('ticket.replacementNegotiating', '换货协商中') },
    BUYER_ACCEPTED_REPLACEMENT: { color: 'processing', text: t('ticket.awaitingShipment', '等待发货') },
    REPLACEMENT_DELIVERED: { color: 'warning', text: t('ticket.awaitingReceiptConfirmation', '待确认收货') },
    ADMIN_REVIEWING: { color: 'warning', text: t('ticket.pending', '待处理') },
    ADMIN_APPROVED: { color: 'success', text: t('ticket.approved', '已批准') },
    ADMIN_REJECTED: { color: 'error', text: t('ticket.rejected', '已拒绝') },
    COMPLETED: { color: 'success', text: t('ticket.completed', '已完成') },
    CLOSED: { color: 'default', text: t('ticket.closed', '已关闭') },
  };

  const getStatusTag = (status: string) => {
    const currentStatus = adminTicketStatuses[status];
    return <span className={`ant-tag ant-tag-${currentStatus?.color || 'default'}`}>{currentStatus?.text || status}</span>;
  };

  const ticketQuery = {
    page: currentPage,
    limit: 20,
    search: searchText || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const totalPages = Math.max(1, Math.ceil((ticketsData?.total || 0) / 20));

  // 判断是否紧急（超过24小时未处理）
  const isUrgent = (ticket: any) => {
    if (ticket.status !== 'ADMIN_REVIEWING') return false;
    const hoursSinceCreated = dayjs().diff(dayjs(ticket.created_at), 'hour');
    return hoursSinceCreated > 24;
  };

  const filteredTickets = ticketsData?.items?.filter((ticket: any) => {
    if (urgencyFilter === 'urgent') {
      return isUrgent(ticket);
    }
    if (urgencyFilter === 'normal') {
      return !isUrgent(ticket);
    }
    return true;
  });

  const emptyList = !isLoading && (!filteredTickets || filteredTickets.length === 0);

  const ticketListContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <Spin />
        </div>
      );
    }

    if (emptyList) {
      return <Empty description={t('ticket.empty', '暂无工单')} />;
    }

    return filteredTickets?.map((ticket: any) => {
      const urgent = isUrgent(ticket);

      return (
        <button
          key={ticket.ticket_no}
          type="button"
          className={`atc-ticket-item ${ticket.unread_admin > 0 ? 'unread' : ''} ${selectedTicketNo === ticket.ticket_no ? 'active' : ''} ${urgent ? 'urgent' : ''}`}
          onClick={() => handleTicketClick(ticket.ticket_no)}
        >
          <div className="atc-ticket-item__icon">
            {urgent ? <WarningOutlined /> : getTypeIcon(ticket.type)}
          </div>
          <div className="atc-ticket-item__main">
            <div className="atc-ticket-item__header">
              <span className="atc-ticket-item__no">#{ticket.ticket_no}</span>
              {getStatusTag(ticket.status)}
            </div>
            <div className="atc-ticket-item__subject">{ticket.subject}</div>
            <div className="atc-ticket-item__meta">
              <span className="atc-ticket-item__users">
                <UserOutlined /> {ticket.buyer_id} ↔ {ticket.seller_id || t('common.none', '无')}
              </span>
              <span className="atc-ticket-item__time">
                {formatRelativeTime(ticket.created_at)}
              </span>
            </div>
          </div>
          {ticket.unread_admin > 0 && (
            <div className="atc-ticket-item__badge">{ticket.unread_admin}</div>
          )}
        </button>
      );
    });
  };

  return (
    <div className="atc-container">
      <div className="atc-layout">
        {/* 左侧边栏 */}
        <aside className="atc-sidebar is-open">
          {/* 头部 */}
          <div className="atc-sidebar__header">
            <h3>
              <i className="fas fa-shield-alt"></i> {t('ticket.adminTitle', '工单管理')}
            </h3>
          </div>

          {/* 统计面板 */}
          <div className="atc-stats">
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.pending || 0}</span>
              <span className="atc-stat__label">{t('ticket.pending', '待处理')}</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.total || 0}</span>
              <span className="atc-stat__label">{t('common.total', '总数')}</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.closed || 0}</span>
              <span className="atc-stat__label">{t('ticket.closed', '已关闭')}</span>
            </div>
            <div className="atc-stat">
              <span className="atc-stat__num">{stats?.avgResponseTime || t('ticket.zeroHours', '0小时')}</span>
              <span className="atc-stat__label">{t('ticket.averageHandle', '平均处理')}</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="atc-sidebar__search">
            <SearchOutlined />
            <input
              type="text"
              placeholder={t('ticket.searchAdminTickets', '搜索工单号/主题/用户...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="atc-filters">
            <div className="atc-filters__row">
              <button type="button" className={`atc-filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
                {t('ticket.filter.all', '全部')}
              </button>
              <button type="button" className={`atc-filter-btn ${typeFilter === 'REFUND' ? 'active' : ''}`} onClick={() => setTypeFilter('REFUND')}>
                {t('ticket.refundType', '售后')}
              </button>
              <button type="button" className={`atc-filter-btn ${typeFilter === 'DM' ? 'active' : ''}`} onClick={() => setTypeFilter('DM')}>
                {t('ticket.directMessageType', '私信')}
              </button>
            </div>

            <div className="atc-filters__row">
              <button type="button" className={`atc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                {t('ticket.filter.all', '全部')}
              </button>
              <button type="button" className={`atc-filter-btn ${statusFilter === 'ADMIN_REVIEWING' ? 'active' : ''}`} onClick={() => setStatusFilter('ADMIN_REVIEWING')}>
                {t('ticket.pending', '待处理')}
              </button>
              <button type="button" className={`atc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`} onClick={() => setStatusFilter('SELLER_REVIEWING')}>
                {t('ticket.sellerProcessing', '卖家处理中')}
              </button>
              <button type="button" className={`atc-filter-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`} onClick={() => setStatusFilter('COMPLETED')}>
                {t('ticket.completed', '已完成')}
              </button>
              <button type="button" className={`atc-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`} onClick={() => setStatusFilter('CLOSED')}>
                {t('ticket.closed', '已关闭')}
              </button>
            </div>

            <div className="atc-filters__row">
              <button type="button" className={`atc-filter-btn ${urgencyFilter === 'all' ? 'active' : ''}`} onClick={() => setUrgencyFilter('all')}>
                {t('ticket.filter.all', '全部')}
              </button>
              <button type="button" className={`atc-filter-btn ${urgencyFilter === 'urgent' ? 'active' : ''}`} onClick={() => setUrgencyFilter('urgent')}>
                {t('ticket.urgent', '紧急')}
              </button>
              <button type="button" className={`atc-filter-btn ${urgencyFilter === 'normal' ? 'active' : ''}`} onClick={() => setUrgencyFilter('normal')}>
                {t('ticket.normal', '正常')}
              </button>
            </div>
          </div>

          <div className="atc-sidebar__list">
            {ticketListContent()}
          </div>

          <div className="atc-pagination">
            <button
              type="button"
              disabled={currentPage === 1}
              aria-label={t('common.previousPage', '上一页')}
              title={t('common.previousPage', '上一页')}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              aria-label={t('common.nextPage', '下一页')}
              title={t('common.nextPage', '下一页')}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </aside>

        <main className="atc-main has-ticket">
          {selectedTicket ? (
            <iframe
              src={`/admin/tickets/${selectedTicketNo}`}
              className="atc-detail-iframe"
              title={t('ticket.detail', '工单详情')}
            />
          ) : (
            <div className="atc-empty-state">
              <Empty description={t('ticket.selectTicket', '请选择一个工单')} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}




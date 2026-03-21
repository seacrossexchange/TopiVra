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
} from '@ant-design/icons';
import { ticketsService } from '@/services/tickets';
import { useI18n } from '@/hooks/useI18n';
import './SellerTicketList.css';

export default function SellerTicketList() {
  const { t } = useTranslation();
  const { formatRelativeTime } = useI18n();
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
    queryFn: () => ticketsService.getSellerTickets(ticketQuery),
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

  const sellerTicketStatuses: Record<string, { color: string; text: string }> = {
    SELLER_REVIEWING: { color: 'processing', text: t('ticket.sellerReplyPending', '待回复') },
    SELLER_AGREED: { color: 'success', text: t('ticket.sellerAgreed', '已同意') },
    SELLER_REJECTED: { color: 'error', text: t('ticket.sellerRejected', '已拒绝') },
    SELLER_OFFERED_REPLACEMENT: { color: 'warning', text: t('ticket.sellerOfferedReplacement', '已提供换货') },
    ADMIN_REVIEWING: { color: 'warning', text: t('ticket.adminReviewing', '客服审核中') },
    COMPLETED: { color: 'success', text: t('ticket.completed', '已完成') },
    CLOSED: { color: 'default', text: t('ticket.closed', '已关闭') },
  };

  const getStatusTag = (status: string) => {
    const currentStatus = sellerTicketStatuses[status];
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
  const filteredTickets = ticketsData?.items?.filter((ticket: any) => {
    if (interventionFilter === 'intervened') {
      return ticket.status === 'ADMIN_REVIEWING';
    }
    if (interventionFilter === 'not_intervened') {
      return ticket.status !== 'ADMIN_REVIEWING';
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

    return filteredTickets?.map((ticket: any) => (
      <button
        key={ticket.ticket_no}
        type="button"
        className={`stc-ticket-item ${ticket.unread_seller > 0 ? 'unread' : ''} ${selectedTicketNo === ticket.ticket_no ? 'active' : ''}`}
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
              {formatRelativeTime(ticket.created_at)}
            </span>
          </div>
        </div>
        {ticket.unread_seller > 0 && (
          <div className="stc-ticket-item__badge">{ticket.unread_seller}</div>
        )}
      </button>
    ));
  };

  return (
    <div className="stc-container">
      <div className="stc-layout">
        {/* 左侧边栏 */}
        <aside className="stc-sidebar is-open">
          {/* 头部 */}
          <div className="stc-sidebar__header">
            <h3>
              <i className="fas fa-headset"></i> {t('ticket.sellerTitle', '工单中心')}
            </h3>
          </div>

          {/* 统计面板 */}
          <div className="stc-stats">
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.pending || 0}</span>
              <span className="stc-stat__label">{t('ticket.pending', '待处理')}</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.total || 0}</span>
              <span className="stc-stat__label">{t('common.total', '总数')}</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.closed || 0}</span>
              <span className="stc-stat__label">{t('ticket.closed', '已关闭')}</span>
            </div>
            <div className="stc-stat">
              <span className="stc-stat__num">{stats?.avgResponseTime || t('ticket.zeroHours', '0小时')}</span>
              <span className="stc-stat__label">{t('ticket.averageReply', '平均回复')}</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="stc-sidebar__search">
            <SearchOutlined />
            <input
              type="text"
              placeholder={t('ticket.searchSellerTickets', '搜索工单号/主题/买家...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="stc-filters">
            {/* 类型筛选 */}
            <div className="stc-filters__row">
              <button
                type="button"
                className={`stc-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                {t('ticket.filter.all', '全部')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${typeFilter === 'REFUND' ? 'active' : ''}`}
                onClick={() => setTypeFilter('REFUND')}
              >
                {t('ticket.refundType', '售后')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${typeFilter === 'DM' ? 'active' : ''}`}
                onClick={() => setTypeFilter('DM')}
              >
                {t('ticket.directMessageType', '私信')}
              </button>
            </div>

            {/* 状态筛选 */}
            <div className="stc-filters__row">
              <button
                type="button"
                className={`stc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                {t('ticket.filter.all', '全部')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_REVIEWING')}
              >
                {t('ticket.pending', '待处理')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${statusFilter === 'SELLER_AGREED,SELLER_OFFERED_REPLACEMENT' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_AGREED,SELLER_OFFERED_REPLACEMENT')}
              >
                {t('ticket.replied', '已回复')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CLOSED')}
              >
                {t('ticket.closed', '已关闭')}
              </button>
            </div>

            {/* 平台介入筛选 */}
            <div className="stc-filters__row">
              <button
                type="button"
                className={`stc-filter-btn ${interventionFilter === 'all' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('all')}
              >
                {t('ticket.filter.all', '全部')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${interventionFilter === 'intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('intervened')}
              >
                {t('ticket.intervened', '已介入')}
              </button>
              <button
                type="button"
                className={`stc-filter-btn ${interventionFilter === 'not_intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('not_intervened')}
              >
                {t('ticket.notIntervened', '未介入')}
              </button>
            </div>
          </div>

          {/* 工单列表 */}
          <div className="stc-sidebar__list">
            {ticketListContent()}
          </div>

          {/* 分页 */}
          <div className="stc-pagination">
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

        {/* 右侧主区域 */}
        <main className="stc-main has-ticket">
          {selectedTicket ? (
            <iframe
              src={`/seller/tickets/${selectedTicketNo}`}
              className="stc-detail-iframe"
              title={t('ticket.detail', '工单详情')}
            />
          ) : (
            <div className="stc-empty-state">
              <Empty description={t('ticket.selectTicket', '请选择一个工单')} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}




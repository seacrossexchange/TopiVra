import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Tag,
  Empty,
  Spin,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  SearchOutlined,
  CommentOutlined,
  ShoppingOutlined,
  UserOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ticketsService } from '@/services/tickets';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './BuyerTicketList.css';

dayjs.extend(relativeTime);

export default function BuyerTicketList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [interventionFilter, setInterventionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicketNo, setSelectedTicketNo] = useState<string | null>(null);

  // 获取工单统计
  const { data: stats } = useQuery({
    queryKey: ['ticket-stats', 'buyer'],
    queryFn: () => ticketsService.getBuyerStats(),
    refetchInterval: 30000,
  });

  // 获取工单列表
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['buyer-tickets', currentPage, searchText, typeFilter, statusFilter],
    queryFn: () =>
      ticketsService.getBuyerTickets({
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTicketNo(ticketNo);
    } else if (ticketsData?.items?.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      SELLER_REVIEWING: { color: 'processing', text: t('ticket.status.sellerReviewing', '卖家审核中') },
      SELLER_AGREED: { color: 'success', text: t('ticket.status.sellerAgreed', '卖家已同意') },
      SELLER_REJECTED: { color: 'error', text: t('ticket.status.sellerRejected', '卖家已拒绝') },
      SELLER_OFFERED_REPLACEMENT: { color: 'warning', text: t('ticket.status.sellerOfferedReplacement', '卖家提供换货') },
      BUYER_ACCEPTED_REPLACEMENT: { color: 'processing', text: t('ticket.status.waitingShipment', '等待发货') },
      REPLACEMENT_DELIVERED: { color: 'warning', text: t('ticket.status.confirmReceipt', '待确认收货') },
      ADMIN_REVIEWING: { color: 'warning', text: t('ticket.status.adminReviewing', '平台审核中') },
      COMPLETED: { color: 'success', text: t('ticket.status.completed', '已完成') },
      CLOSED: { color: 'default', text: t('ticket.status.closed', '已关闭') },
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
    <div className="btc-container">
      <div className="btc-layout">
        {/* 左侧边栏 */}
        <aside className="btc-sidebar is-open">
          {/* 头部 */}
          <div className="btc-sidebar__header">
            <h3>
              <i className="fas fa-headset"></i> {t('ticket.myTickets', '我的工单')}
            </h3>
            <button 
              className="btc-create-btn"
              onClick={() => navigate('/buyer/orders')}
            >
              <PlusOutlined /> {t('ticket.newTicket', '新建工单')}
            </button>
          </div>

          {/* 统计面板 */}
          <div className="btc-stats">
            <div className="btc-stat">
              <span className="btc-stat__num">{stats?.pending || 0}</span>
              <span className="btc-stat__label">{t('ticket.stats.processing', '处理中')}</span>
            </div>
            <div className="btc-stat">
              <span className="btc-stat__num">{stats?.total || 0}</span>
              <span className="btc-stat__label">{t('ticket.stats.total', '总数')}</span>
            </div>
            <div className="btc-stat">
              <span className="btc-stat__num">{stats?.closed || 0}</span>
              <span className="btc-stat__label">{t('ticket.stats.closed', '已关闭')}</span>
            </div>
            <div className="btc-stat">
              <span className="btc-stat__num">{stats?.avgResponseTime || t('ticket.stats.zeroHours', '0小时')}</span>
              <span className="btc-stat__label">{t('ticket.stats.avgResponse', '平均回复')}</span>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="btc-sidebar__search">
            <SearchOutlined />
            <input
              type="text"
              placeholder={t('ticket.searchPlaceholder', '搜索工单号/主题/卖家...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="btc-filters">
            {/* 类型筛选 */}
            <div className="btc-filters__row">
              <button
                className={`btc-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                {t('common.all', '全部')}
              </button>
              <button
                className={`btc-filter-btn ${typeFilter === 'REFUND' ? 'active' : ''}`}
                onClick={() => setTypeFilter('REFUND')}
              >
                {t('ticket.type.refund', '售后')}
              </button>
              <button
                className={`btc-filter-btn ${typeFilter === 'DM' ? 'active' : ''}`}
                onClick={() => setTypeFilter('DM')}
              >
                {t('ticket.type.dm', '私信')}
              </button>
            </div>

            {/* 状态筛选 */}
            <div className="btc-filters__row">
              <button
                className={`btc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                {t('common.all', '全部')}
              </button>
              <button
                className={`btc-filter-btn ${statusFilter === 'SELLER_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_REVIEWING')}
              >
                {t('ticket.filter.waitingSeller', '待卖家处理')}
              </button>
              <button
                className={`btc-filter-btn ${statusFilter === 'SELLER_OFFERED_REPLACEMENT' ? 'active' : ''}`}
                onClick={() => setStatusFilter('SELLER_OFFERED_REPLACEMENT')}
              >
                {t('ticket.filter.waitingMe', '待我响应')}
              </button>
              <button
                className={`btc-filter-btn ${statusFilter === 'ADMIN_REVIEWING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ADMIN_REVIEWING')}
              >
                {t('ticket.filter.adminReviewing', '平台审核中')}
              </button>
              <button
                className={`btc-filter-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                {t('ticket.filter.completed', '已完成')}
              </button>
              <button
                className={`btc-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CLOSED')}
              >
                {t('ticket.filter.closed', '已关闭')}
              </button>
            </div>

            {/* 平台介入筛选 */}
            <div className="btc-filters__row">
              <button
                className={`btc-filter-btn ${interventionFilter === 'all' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('all')}
              >
                {t('common.all', '全部')}
              </button>
              <button
                className={`btc-filter-btn ${interventionFilter === 'intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('intervened')}
              >
                {t('ticket.filter.intervened', '已介入')}
              </button>
              <button
                className={`btc-filter-btn ${interventionFilter === 'not_intervened' ? 'active' : ''}`}
                onClick={() => setInterventionFilter('not_intervened')}
              >
                {t('ticket.filter.notIntervened', '未介入')}
              </button>
            </div>
          </div>

          {/* 工单列表 */}
          <div className="btc-sidebar__list">
            {isLoading ? (
              <div className="text-center py-8">
                <Spin />
              </div>
            ) : filteredTickets?.length === 0 ? (
              <Empty description={t('ticket.noTickets', '暂无工单')} />
            ) : (
              filteredTickets?.map((ticket: any) => (
                <div
                  key={ticket.ticket_no}
                  className={`btc-ticket-item ${
                    ticket.unread_buyer > 0 ? 'unread' : ''
                  } ${selectedTicketNo === ticket.ticket_no ? 'active' : ''}`}
                  onClick={() => handleTicketClick(ticket.ticket_no)}
                >
                  <div className="btc-ticket-item__icon">
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div className="btc-ticket-item__main">
                    <div className="btc-ticket-item__header">
                      <span className="btc-ticket-item__no">#{ticket.ticket_no}</span>
                      {getStatusTag(ticket.status)}
                    </div>
                    <div className="btc-ticket-item__subject">{ticket.subject}</div>
                    <div className="btc-ticket-item__meta">
                      <span className="btc-ticket-item__seller">
                        <UserOutlined /> {ticket.seller_id || t('common.platform', '平台')}
                      </span>
                      <span className="btc-ticket-item__time">
                        {dayjs(ticket.created_at).fromNow()}
                      </span>
                    </div>
                  </div>
                  {ticket.unread_buyer > 0 && (
                    <div className="btc-ticket-item__badge">{ticket.unread_buyer}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          <div className="btc-pagination">
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
        <main className="btc-main has-ticket">
          {selectedTicket ? (
            <iframe
              src={`/buyer/tickets/${selectedTicketNo}`}
              className="btc-detail-iframe"
              title={t('ticket.detailTitle', '工单详情')}
            />
          ) : (
            <div className="btc-empty-state">
              <Empty description={t('ticket.selectToView', '请选择一个工单查看详情')} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}







import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Progress } from 'antd';
import { FireOutlined, ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import './HotDeals.css';

const { Title, Text } = Typography;

interface HotDeal {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  discount: number;
  stock: number;
  soldCount: number;
  images?: string[];
  platform?: string;
  endTime: string;
}

export default function HotDeals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<HotDeal[]>([]);
  const [countdown, setCountdown] = useState<Record<string, number>>({});

  async function fetchHotDeals() {
    try {
      const response = await apiClient.get('/products/hot-deals');
      setDeals(response.data || []);
    } catch (error) {
      console.error('Failed to fetch hot deals:', error);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHotDeals();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const newCountdown: Record<string, number> = {};
      deals.forEach(deal => {
        const remaining = Math.max(0, new Date(deal.endTime).getTime() - now);
        newCountdown[deal.id] = Math.floor(remaining / 1000);
      });
      setCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(timer);
  }, [deals]);


  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (deals.length === 0) {
    return null;
  }

  return (
    <section className="hot-deals-section">
      <div className="hot-deals-container">
        <div className="hot-deals-header">
          <Space>
            <FireOutlined className="hot-deals-icon" />
            <Title level={2} style={{ margin: 0 }}>
              {t('home.hotDeals.title', '🔥 限时特惠')}
            </Title>
          </Space>
          <div className="hot-deals-countdown">
            <ClockCircleOutlined />
            <Text>{t('home.hotDeals.ending', '距结束还有')} </Text>
            <Text strong className="countdown-text">
              {deals[0] && countdown[deals[0].id] ? formatCountdown(countdown[deals[0].id]) : '00:00:00'}
            </Text>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          {deals.map((deal) => (
            <Col xs={24} sm={12} md={8} lg={6} key={deal.id}>
              <Card
                hoverable
                className="hot-deal-card"
                onClick={() => navigate(`/products/${deal.id}`)}
                cover={
                  <div className="hot-deal-cover">
                    <Tag color="red" className="hot-deal-badge">
                      {t('home.hotDeals.limited', '限时')}
                    </Tag>
                    <img
                      src={deal.images?.[0] || '/placeholder.svg'}
                      alt={deal.title}
                      className="hot-deal-image"
                    />
                  </div>
                }
              >
                <div className="hot-deal-content">
                  <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: '0 0 8px' }}>
                    {deal.title}
                  </Title>
                  
                  <div className="hot-deal-price-row">
                    <Space direction="vertical" size={0}>
                      <Text delete type="secondary" style={{ fontSize: 12 }}>
                        ${deal.originalPrice}
                      </Text>
                      <Text strong style={{ fontSize: 20, color: '#ff4d4f' }}>
                        ${deal.price}
                      </Text>
                    </Space>
                    <Tag color="red" style={{ fontSize: 14, padding: '2px 8px' }}>
                      -{deal.discount}%
                    </Tag>
                  </div>

                  <div className="hot-deal-meta">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('home.hotDeals.sold', '已售')} {deal.soldCount}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('home.hotDeals.stock', '仅剩')} {deal.stock}
                    </Text>
                  </div>

                  <div className="hot-deal-progress">
                    <Progress
                      percent={Math.round((deal.soldCount / (deal.soldCount + deal.stock)) * 100)}
                      strokeColor="#ff4d4f"
                      showInfo={false}
                      size="small"
                    />
                  </div>

                  <Button
                    type="primary"
                    danger
                    block
                    icon={<ThunderboltOutlined />}
                    style={{ marginTop: 8 }}
                  >
                    {t('home.hotDeals.buyNow', '立即抢购')}
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}




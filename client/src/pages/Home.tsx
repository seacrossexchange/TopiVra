import { useState, useEffect } from 'react';
import { Button, Row, Col, Card, Typography, Rate, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingOutlined, PhoneOutlined, SafetyOutlined,
  ThunderboltOutlined, CustomerServiceOutlined, GlobalOutlined,
  UserAddOutlined, SearchOutlined, CreditCardOutlined,
  CheckCircleOutlined, SendOutlined, MailOutlined,
  ClockCircleOutlined, RightOutlined,
} from '@ant-design/icons';
import { useSeo } from '@/hooks/useSeo';
import { SEO } from '@/components/SEO';
import apiClient from '@/services/apiClient';
import './Home.css';

const { Title, Text } = Typography;

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [siteStats, setSiteStats] = useState({ userCount: 0, orderCount: 0 });
  const [adSlots, setAdSlots] = useState([
    { platform: 'TikTok',   label: '零售', price: '$12', tag: 'HOT',  enabled: true },
    { platform: 'Instagram',label: '批发', price: '$8',  tag: 'NEW',  enabled: true },
    { platform: 'Facebook', label: '零售', price: '$15', tag: '',     enabled: true },
    { platform: 'Telegram', label: '批发', price: '$6',  tag: 'HOT',  enabled: true },
    { platform: 'Twitter',  label: '零售', price: '$10', tag: 'NEW',  enabled: true },
  ]);

  useEffect(() => {
    apiClient.get('/admin/dashboard/stats').then(({ data }) => {
      if (data) setSiteStats({ userCount: data.userCount || 0, orderCount: data.orderCount || 0 });
    }).catch(() => {});
    // 读取广告位配置
    apiClient.get('/admin/config/ad-slots').then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) {
        setAdSlots(data);
      }
    }).catch(() => {});
  }, []);

  useSeo({
    description: t('home.seoDesc', 'TopiVra 全球社交账号交易平台'),
    keywords: ['TopiVra', '数字账号交易', 'TikTok账号'],
  });

  const testimonials = [
    { id: 1, name: t('home.testimonials.name1', '张先生'), role: t('home.testimonials.role1','电商运营'), rating: 5, comment: t('home.testimonials.comment1','账号质量很好，客服响应及时，非常满意！') },
    { id: 2, name: 'Sarah L.', role: 'Social Media', rating: 5, comment: t('home.testimonials.comment2', 'Fast delivery and great quality. Highly recommended!') },
    { id: 3, name: t('home.testimonials.name3', '李女士'), role: t('home.testimonials.role3','内容创作者'), rating: 5, comment: t('home.testimonials.comment3','第一次购买就很顺利，账号稳定，会继续回购。') },
    { id: 4, name: 'Mike T.', role: 'Influencer', rating: 5, comment: t('home.testimonials.comment4', 'Professional service and secure transactions. Best platform!') },
  ];

  const tutorials = [
    { id: 1, title: t('home.tutorials.t1','Facebook cookie+token 登入方法'), date: '2026-02-28', readTime: '5 min', category: 'Facebook' },
    { id: 2, title: t('home.tutorials.t2','TikTok 账号登入教程'), date: '2026-02-27', readTime: '3 min', category: 'TikTok' },
    { id: 3, title: t('home.tutorials.t3','Instagram 账号登入指南'), date: '2026-02-26', readTime: '4 min', category: 'Instagram' },
  ];

  const platforms = ['TikTok', 'Instagram', 'Facebook', 'Telegram', 'Twitter', 'Discord', 'Gmail'];

  const steps = [
    { icon: <UserAddOutlined />, step: '01', titleKey: 'home.steps.register', descKey: 'home.steps.registerDesc' },
    { icon: <SearchOutlined />, step: '02', titleKey: 'home.steps.choose', descKey: 'home.steps.chooseDesc' },
    { icon: <CreditCardOutlined />, step: '03', titleKey: 'home.steps.pay', descKey: 'home.steps.payDesc' },
    { icon: <CheckCircleOutlined />, step: '04', titleKey: 'home.steps.receive', descKey: 'home.steps.receiveDesc' },
  ];

  const features = [
    { icon: <SafetyOutlined />, titleKey: 'home.features.escrow', descKey: 'home.features.escrowDesc' },
    { icon: <ThunderboltOutlined />, titleKey: 'home.features.auto', descKey: 'home.features.autoDesc' },
    { icon: <GlobalOutlined />, titleKey: 'home.features.multi', descKey: 'home.features.multiDesc' },
    { icon: <CustomerServiceOutlined />, titleKey: 'home.features.support', descKey: 'home.features.supportDesc' },
  ];

  return (
    <div className="home-container">
      <SEO 
        title={t('home.seoDesc')}
        description={t('home.seoDesc')}
        keywords="TopiVra, TikTok, Instagram, Facebook, social accounts, digital accounts"
      />

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-inner">
          {/* 左侧文字区 */}
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              {t('home.hero.badge', '数字账号交易平台 · 全球用户信赖')}
            </div>
            <h1 className="hero-title">
              {t('home.hero.title1', '购买优质')}<span className="hero-title-accent">{t('home.hero.title2', '社交媒体账号')}</span>
            </h1>
            <p className="hero-desc">
              {t('home.hero.desc', '零售 / 批发均可 · 支持 TikTok、Instagram、Facebook 等主流平台')}
            </p>
            <div className="hero-trust-row">
              <span className="hero-trust-item"><CheckCircleOutlined /> {t('home.hero.trust1', '平台担保交易')}</span>
              <span className="hero-trust-item"><ThunderboltOutlined /> {t('home.hero.trust2', '24H 自动发货')}</span>
              <span className="hero-trust-item"><SafetyOutlined /> {t('home.hero.trust3', '账号品质保障')}</span>
            </div>
            <div className="hero-actions">
              <Button type="primary" size="large" icon={<ShoppingOutlined />} onClick={() => navigate('/products')} className="hero-btn-primary">
                {t('home.hero.browse', '立即浏览商品')}
              </Button>
              <Button size="large" icon={<PhoneOutlined />} onClick={() => navigate('/contact')} className="hero-btn-secondary">
                {t('home.hero.contact', '联系客服')}
              </Button>
            </div>
            <div className="hero-platforms">
              <span className="hero-platform-label">{t('home.hero.platforms', '支持平台：')}</span>
              {platforms.map(p => <span key={p} className="hero-platform-tag">{p}</span>)}
            </div>
          </div>
          {/* 右侧可视化卡片 */}
          <div className="hero-right">
            <div className="hero-visual">
              <div className="hero-visual-header">
                <span className="hero-visual-dot red" />
                <span className="hero-visual-dot yellow" />
                <span className="hero-visual-dot green" />
                <span className="hero-visual-title">TopiVra Market</span>
              </div>
              <div className="hero-visual-body">
                {adSlots.filter(s => s.enabled && s.platform && s.price).map((item, i) => (
                  <div key={i} className="hero-visual-row hero-visual-row-link" onClick={() => navigate(`/products?platform=${item.platform}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/products?platform=${item.platform}`)}>
                    <div className="hero-visual-platform">
                      <span className="hero-visual-platform-dot" />
                      <span className="hero-visual-platform-name">{item.platform}</span>
                      {item.tag && <span className="hero-visual-tag">{item.tag}</span>}
                    </div>
                    <div className="hero-visual-right-col">
                      <span className="hero-visual-type">{item.label}</span>
                      <span className="hero-visual-price">{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 社区统计条 */}
      <section className="community-bar">
        <div className="community-bar-inner">
          <div className="community-stat">
            <div className="community-stat-value">
              {siteStats.userCount > 0 ? `${(siteStats.userCount / 10000).toFixed(1)}${t('home.stats.wan','万')}+` : `12${t('home.stats.wan','万')}+`}
            </div>
            <div className="community-stat-label">{t('home.stats.users','已服务用户')}</div>
          </div>
          <div className="community-stat">
            <div className="community-stat-value">
              {siteStats.orderCount > 0 ? `${(siteStats.orderCount / 10000).toFixed(0)}${t('home.stats.wan','万')}+` : `500${t('home.stats.wan','万')}+`}
            </div>
            <div className="community-stat-label">{t('home.stats.accounts','已售账号')}</div>
          </div>
          <div className="community-stat">
            <div className="community-stat-value">99.2%</div>
            <div className="community-stat-label">{t('home.stats.rating','好评率')}</div>
          </div>
          <div className="community-stat">
            <div className="community-stat-value">7×24H</div>
            <div className="community-stat-label">{t('home.stats.support','在线客服')}</div>
          </div>
        </div>
      </section>

      {/* 购买流程 */}
      <section className="process-section">
        <div className="process-container">
          <Title level={2} className="section-title">{t('home.steps.title','简单四步，轻松购买')}</Title>
          <Row gutter={[24, 24]}>
            {steps.map((item) => (
              <Col xs={24} sm={12} md={6} key={item.step}>
                <Card bordered={false} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, textAlign: 'center', padding: '24px 16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 32, fontWeight: 800, color: 'var(--color-border-dark)', lineHeight: 1 }}>{item.step}</div>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, color: 'var(--color-primary)' }}>{item.icon}</div>
                  <Title level={5} style={{ margin: '0 0 6px', color: 'var(--color-text-primary)' }}>{t(item.titleKey)}</Title>
                  <Text style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>{t(item.descKey)}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 平台优势 */}
      <section className="features-section">
        <div className="features-container">
          <Title level={2} className="section-title">{t('home.features.title','为什么选择 TopiVra')}</Title>
          <Row gutter={[20, 20]}>
            {features.map((f, i) => (
              <Col xs={24} sm={12} md={6} key={i}>
                <div className="feature-card">
                  <div className="feature-icon-wrap"><span className="feature-icon">{f.icon}</span></div>
                  <Title level={5} className="feature-title">{t(f.titleKey)}</Title>
                  <p className="feature-desc">{t(f.descKey)}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 客户评价 */}
      <section className="testimonials-section">
        <div className="testimonials-container">
          <Title level={2} className="section-title">{t('home.testimonials.title','客户评价')}</Title>
          <Row gutter={[20, 20]}>
            {testimonials.map((item) => (
              <Col xs={24} sm={12} md={6} key={item.id}>
                <div className="testimonial-card">
                  <Rate disabled defaultValue={item.rating} className="testimonial-rate" />
                  <p className="testimonial-comment">&quot;{item.comment}&quot;</p>
                  <Text strong style={{ color: 'var(--color-text-primary)' }}>{item.name}</Text>
                  <br />
                  <span className="testimonial-role">{item.role}</span>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 教程 */}
      <section className="tutorials-section">
        <div className="tutorials-container">
          <div className="tutorials-header">
            <Title level={2} style={{ margin: 0, color: 'var(--color-text-primary)' }}>{t('home.tutorials.title','使用教程')}</Title>
            <Button type="link" onClick={() => navigate('/blog')} icon={<RightOutlined />} iconPosition="end">{t('home.tutorials.viewAll','查看全部')}</Button>
          </div>
          <Row gutter={[20, 20]}>
            {tutorials.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <div className="tutorial-card" onClick={() => navigate('/blog')} style={{ cursor: 'pointer', padding: 20 }}>
                  <Tag color="blue" className="tutorial-tag">{item.category}</Tag>
                  <Title level={5} className="tutorial-title">{item.title}</Title>
                  <div className="tutorial-meta"><span>{item.date}</span><span><ClockCircleOutlined /> {item.readTime}</span></div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 联系 */}
      <section className="contact-section">
        <div className="contact-container">
          <Title level={2} className="section-title">{t('home.contact.title','联系我们')}</Title>
          <Row gutter={[20, 20]}>
            <Col xs={24} md={8}>
              <div className="contact-card" onClick={() => window.open('https://t.me/topivra_bot','_blank')}>
                <div className="contact-icon-wrap"><CustomerServiceOutlined className="contact-icon" /></div>
                <Title level={5} style={{ color:'var(--color-text-primary)',margin:'0 0 6px' }}>Telegram {t('home.contact.service','客服')}</Title>
                <p style={{ color:'var(--color-text-tertiary)',margin:0,fontSize:13 }}>{t('home.contact.serviceDesc','在线客服机器人')}</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="contact-card" onClick={() => window.open('https://t.me/topivra','_blank')}>
                <div className="contact-icon-wrap"><SendOutlined className="contact-icon" /></div>
                <Title level={5} style={{ color:'var(--color-text-primary)',margin:'0 0 6px' }}>Telegram {t('home.contact.channel','频道')}</Title>
                <p style={{ color:'var(--color-text-tertiary)',margin:0,fontSize:13 }}>{t('home.contact.channelDesc','公告与优惠信息')}</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="contact-card" onClick={() => window.location.href='mailto:support@topivra.com'}>
                <div className="contact-icon-wrap"><MailOutlined className="contact-icon" /></div>
                <Title level={5} style={{ color:'var(--color-text-primary)',margin:'0 0 6px' }}>{t('home.contact.email','邮件支持')}</Title>
                <p style={{ color:'var(--color-text-tertiary)',margin:0,fontSize:13 }}>support@topivra.com</p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* CTA */}
      <section className="seller-cta-section">
        <div className="seller-cta-content">
          <Title level={2} className="seller-cta-title">{t('home.seller.title','拥有优质账号货源？')}</Title>
          <p className="seller-cta-desc">{t('home.seller.desc','加入我们的卖家社区，开启您的在线业务，享受低佣金 + 快速结算')}</p>
          <Button size="large" onClick={() => navigate('/apply-seller')} className="seller-cta-button">
            {t('home.seller.apply','立即申请成为卖家')}
          </Button>
        </div>
      </section>

    </div>
  );
}

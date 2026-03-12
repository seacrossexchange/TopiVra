import { Row, Col, Typography, Breadcrumb } from 'antd';
import {
  HomeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './About.css';

const { Title, Paragraph } = Typography;

const STATS = [
  { num: '500,000+', labelKey: 'about.accountsSold' },
  { num: '5,042', labelKey: 'about.satisfiedCustomers' },
  { num: '7/24H', labelKey: 'about.customerSupport' },
];

const FEATURES = [
  { icon: <ThunderboltOutlined />, titleKey: 'about.autoDelivery', descKey: 'about.autoDeliveryDesc' },
  { icon: <AppstoreOutlined />, titleKey: 'about.multiPlatform', descKey: 'about.multiPlatformDesc' },
  { icon: <SafetyCertificateOutlined />, titleKey: 'about.secureTransaction', descKey: 'about.secureTransactionDesc' },
  { icon: <CustomerServiceOutlined />, titleKey: 'about.professionalSupport', descKey: 'about.professionalSupportDesc' },
];

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Twitter', 'Telegram', 'YouTube', 'Discord', 'Gmail', 'Outlook'];

const TRUST_ITEMS = [
  { key: 'about.feature1' },
  { key: 'about.feature2' },
  { key: 'about.feature3' },
  { key: 'about.feature4' },
];

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="about-page">
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          { title: <Link to="/"><HomeOutlined /></Link> },
          { title: t('about.title') },
        ]}
      />

      {/* Hero */}
      <div className="about-hero">
        <Title level={1} className="hero-title">
          {t('about.title')}
        </Title>
        <Paragraph className="hero-intro">
          {t('about.intro')}
        </Paragraph>
        <div className="trust-badges">
          {TRUST_ITEMS.map((item) => (
            <span key={item.key} className="trust-badge">
              <CheckCircleOutlined /> {t(item.key)}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {STATS.map((s) => (
          <Col xs={24} sm={8} key={s.labelKey}>
            <div className="about-stat-card">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{t(s.labelKey)}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Features */}
      <Title level={3} className="about-section-title">{t('about.featuresTitle')}</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {FEATURES.map((f) => (
          <Col xs={24} sm={12} key={f.titleKey}>
            <div className="about-feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{t(f.titleKey)}</div>
              <div className="feature-desc">{t(f.descKey)}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Platforms */}
      <Title level={3} className="about-section-title">{t('about.platformsTitle', '支持平台')}</Title>
      <div className="about-platforms">
        {PLATFORMS.map((p) => (
          <span key={p} className="platform-tag">{p}</span>
        ))}
      </div>
    </div>
  );
}
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Typography, Space, Tag } from 'antd';
import { Link } from 'react-router-dom';
import {
  SafetyCertificateOutlined,
  MessageOutlined,
  MailOutlined,
  ToolOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useSeo } from '@/hooks/useSeo';
import './Tools.css';

const { Title, Paragraph } = Typography;

interface ToolCardProps {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  tagKey: string;
  path: string;
  status?: 'available' | 'coming-soon';
}

function ToolCard({ icon, titleKey, descKey, tagKey, path, status = 'available' }: ToolCardProps) {
  const { t } = useTranslation();
  
  const cardContent = (
    <Card 
      hoverable={status === 'available'}
      className={`tool-card ${status === 'coming-soon' ? 'tool-card-disabled' : ''}`}
    >
      <Space direction="vertical" size="middle" className="tool-card-content">
        <div className="tool-card-icon">{icon}</div>
        <div>
          <Title level={4} className="tool-card-title">{t(titleKey)}</Title>
          <Paragraph className="tool-card-desc">{t(descKey)}</Paragraph>
        </div>
        <div className="tool-card-footer">
          <Tag className="tool-card-tag">{t(tagKey)}</Tag>
          {status === 'coming-soon' && (
            <Tag color="orange">{t('common.comingSoon')}</Tag>
          )}
        </div>
      </Space>
    </Card>
  );

  if (status === 'coming-soon') {
    return cardContent;
  }

  return <Link to={path}>{cardContent}</Link>;
}

const toolItems: ToolCardProps[] = [
  {
    icon: <SafetyCertificateOutlined />,
    titleKey: 'tools.cards.2fa.title',
    descKey: 'tools.cards.2fa.desc',
    tagKey: 'tools.cards.2fa.tag',
    path: '/tools/2fa-generator',
    status: 'available',
  },
  {
    icon: <MessageOutlined />,
    titleKey: 'tools.cards.telegram.title',
    descKey: 'tools.cards.telegram.desc',
    tagKey: 'tools.cards.telegram.tag',
    path: '/tools/telegram',
    status: 'coming-soon',
  },
  {
    icon: <SearchOutlined />,
    titleKey: 'tools.cards.check.title',
    descKey: 'tools.cards.check.desc',
    tagKey: 'tools.cards.check.tag',
    path: '/tools/check',
    status: 'coming-soon',
  },
  {
    icon: <MailOutlined />,
    titleKey: 'tools.cards.hotmail.title',
    descKey: 'tools.cards.hotmail.desc',
    tagKey: 'tools.cards.hotmail.tag',
    path: '/tools/hotmail',
    status: 'coming-soon',
  },
];

export default function Tools() {
  const { t } = useTranslation();

  useSeo({
    title: t('tools.title'),
    description: t('tools.subtitle'),
    keywords: ['2FA', 'TOTP', 'verification', 'tools'],
  });

  return (
    <div className="tools-page">
      <div className="tools-container">
        {/* Header */}
        <div className="tools-header">
          <ToolOutlined className="tools-header-icon" />
          <Title level={2}>{t('tools.title')}</Title>
          <Paragraph className="tools-subtitle">
            {t('tools.subtitle')}
          </Paragraph>
        </div>

        {/* Tools Grid */}
        <Row gutter={[24, 24]}>
          {toolItems.map((tool) => (
            <Col xs={24} sm={12} lg={8} key={tool.path}>
              <ToolCard {...tool} />
            </Col>
          ))}
        </Row>

        {/* Info Section */}
        <Card className="tools-info-card">
          <Title level={4}>{t('tools.infoTitle')}</Title>
          <ul className="tools-info-list">
            <li>{t('tools.info1')}</li>
            <li>{t('tools.info2')}</li>
            <li>{t('tools.info3')}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
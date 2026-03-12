import { Typography, Card, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PolicyPage.css';

const { Title, Paragraph } = Typography;

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <Breadcrumb items={[
        { title: <Link to="/"><HomeOutlined /></Link> },
        { title: t('privacy.title', '隐私政策') },
      ]} style={{ marginBottom: 24 }} />

      <Card className="policy-card">
        <Title level={2} className="policy-title">{t('privacy.title', '隐私政策')}</Title>
        
        <Title level={4} className="policy-section-title">{t('privacy.section1Title', '1. 信息收集')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section1Content', '我们收集您在使用本平台时提供的个人信息，包括但不限于：用户名、邮箱地址、联系方式、交易记录等。这些信息用于提供和改进我们的服务。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section2Title', '2. 信息使用')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section2Content', '您的个人信息仅用于：处理订单、提供客户支持、发送重要通知、改进平台功能。我们不会将您的信息用于其他目的。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section3Title', '3. 信息保护')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section3Content', '我们采用行业标准的安全措施保护您的信息，包括数据加密、访问控制、安全审计等。未经授权的第三方无法访问您的个人信息。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section4Title', '4. 信息共享')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section4Content', '我们不会向第三方出售或出租您的个人信息。仅在以下情况下可能共享：经您同意、法律要求、保护平台权益。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section5Title', '5. Cookie 使用')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section5Content', '本平台使用 Cookie 来改善用户体验、分析网站流量。您可以在浏览器设置中选择禁用 Cookie。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section6Title', '6. 数据保留')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section6Content', '我们会在必要的时间内保留您的个人信息。账户注销后，我们将在合理期限内删除您的个人信息。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section7Title', '7. 您的权利')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section7Content', '您有权访问、更正、删除您的个人信息。如有需求，请联系我们的客服团队。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('privacy.section8Title', '8. 政策更新')}</Title>
        <Paragraph className="policy-paragraph">{t('privacy.section8Content', '我们可能不时更新本隐私政策。重大变更将通过网站公告通知您。')}</Paragraph>

        <Paragraph type="secondary" className="policy-update-info">{t('privacy.lastUpdate', '最后更新：2026年2月28日')}</Paragraph>
      </Card>
    </div>
  );
}
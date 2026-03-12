import { Typography, Card, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PolicyPage.css';

const { Title, Paragraph } = Typography;

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <Breadcrumb items={[
        { title: <Link to="/"><HomeOutlined /></Link> },
        { title: t('terms.title', '服务条款') },
      ]} style={{ marginBottom: 24 }} />

      <Card className="policy-card">
        <Title level={2} className="policy-title">{t('terms.title', '服务条款')}</Title>
        
        <Title level={4} className="policy-section-title">{t('terms.section1Title', '1. 服务说明')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section1Content', 'TopiVra 是一个社交账号交易平台，为买家和卖家提供交易服务。使用本平台即表示您同意遵守以下条款。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section2Title', '2. 用户责任')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section2Content', '用户须确保提供的所有信息真实准确。禁止使用本平台进行任何违法活动，包括但不限于欺诈、洗钱等行为。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section3Title', '3. 交易规则')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section3Content', '所有交易通过平台担保进行。买家付款后，资金将由平台托管，确认收货后才会释放给卖家。交易完成后，买家有24小时时间验证账号。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section4Title', '4. 卖家义务')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section4Content', '卖家必须确保所售账号真实有效，并按照商品描述提供账号信息。如账号存在问题，卖家须承担相应责任。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section5Title', '5. 买家义务')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section5Content', '买家须在收到账号后24小时内完成验证。超时未提出异议将视为交易完成。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section6Title', '6. 争议处理')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section6Content', '如发生争议，双方可通过平台客服协商解决。平台有权根据证据判定争议结果。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section7Title', '7. 隐私保护')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section7Content', '平台严格保护用户隐私，不会向第三方泄露用户信息，除非法律要求。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('terms.section8Title', '8. 条款修改')}</Title>
        <Paragraph className="policy-paragraph">{t('terms.section8Content', '平台有权随时修改本条款。修改后的条款将在网站公布，继续使用本平台即表示接受修改后的条款。')}</Paragraph>

        <Paragraph type="secondary" className="policy-update-info">{t('terms.lastUpdate', '最后更新：2026年2月28日')}</Paragraph>
      </Card>
    </div>
  );
}
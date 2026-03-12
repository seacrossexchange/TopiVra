import { Typography, Card, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PolicyPage.css';

const { Title, Paragraph } = Typography;

export default function Refund() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <Breadcrumb items={[
        { title: <Link to="/"><HomeOutlined /></Link> },
        { title: t('refund.title', '退款政策') },
      ]} style={{ marginBottom: 24 }} />

      <Card className="policy-card">
        <Title level={2} className="policy-title">{t('refund.title', '退款政策')}</Title>
        
        <Title level={4} className="policy-section-title">{t('refund.section1Title', '1. 退款条件')}</Title>
        <Paragraph className="policy-paragraph">{t('refund.section1Content', '在以下情况下，买家可以申请退款：账号无法登录、账号信息与描述严重不符、账号存在安全隐患。退款申请须在收货后24小时内提出。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('refund.section2Title', '2. 退款流程')}</Title>
        <Paragraph className="policy-paragraph">
          {t('refund.section2Content', `1. 买家在订单详情页提交退款申请并说明原因。
2. 卖家在48小时内响应退款申请。
3. 如双方无法达成一致，可申请平台介入。
4. 平台审核通过后，退款将在1-3个工作日内退回原支付账户。`)}
        </Paragraph>

        <Title level={4} className="policy-section-title">{t('refund.section3Title', '3. 不予退款情况')}</Title>
        <Paragraph className="policy-paragraph">
          {t('refund.section3Content', `以下情况不支持退款：
- 超过24小时验证期限
- 账号因买家操作不当导致封禁
- 买家已修改账号密码或绑定信息
- 虚假退款申请`)}
        </Paragraph>

        <Title level={4} className="policy-section-title">{t('refund.section4Title', '4. 退款金额')}</Title>
        <Paragraph className="policy-paragraph">{t('refund.section4Content', '退款金额为买家实际支付金额。如使用优惠券，优惠券不予退还。退款不包含手续费。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('refund.section5Title', '5. 争议处理')}</Title>
        <Paragraph className="policy-paragraph">{t('refund.section5Content', '如买卖双方对退款存在争议，平台将根据双方提供的证据进行判定。平台判定为最终结果。')}</Paragraph>

        <Title level={4} className="policy-section-title">{t('refund.section6Title', '6. 客服联系')}</Title>
        <Paragraph className="policy-paragraph">{t('refund.section6Content', '如有退款相关问题，请联系客服：support@topivra.com 或通过 Telegram 客服。')}</Paragraph>

        <Paragraph type="secondary" className="policy-update-info">{t('refund.lastUpdate', '最后更新：2026年2月28日')}</Paragraph>
      </Card>
    </div>
  );
}
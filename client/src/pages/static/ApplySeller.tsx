import { Typography, Row, Col, Card, Form, Input, Button, Checkbox } from 'antd';
import { Breadcrumb } from 'antd';
import { HomeOutlined, ShopOutlined, DollarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

interface ApplySellerFormValues {
  shopName: string;
  email: string;
  telegram?: string;
  platforms?: string[];
  description?: string;
}

export default function ApplySeller() {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleSubmit = (values: ApplySellerFormValues) => {
    // Form submission - in production, this would send to backend
    void values; // Values used for form submission
    message.success(t('applySeller.submitSuccess', '申请已提交，我们会尽快审核！'));
    form.resetFields();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <Breadcrumb items={[
        { title: <Link to="/"><HomeOutlined /></Link> },
        { title: t('applySeller.title', '申请成为卖家') },
      ]} style={{ marginBottom: '24px' }} />

      <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
        {t('applySeller.title', '申请成为卖家')}
      </Title>
      <Paragraph style={{ textAlign: 'center', marginBottom: '32px' }} type="secondary">
        {t('applySeller.subtitle', '拥有优质账号货源？加入我们的卖家社区')}
      </Paragraph>

      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} md={8}>
          <Card hoverable style={{ textAlign: 'center', padding: '16px' }}>
            <ThunderboltOutlined style={{ fontSize: '32px', color: 'var(--color-primary)', marginBottom: '12px' }} />
            <Title level={4}>{t('applySeller.benefit1Title', '高曝光')}</Title>
            <Paragraph type="secondary">{t('applySeller.benefit1Desc', '平台流量支持')}</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable style={{ textAlign: 'center', padding: '16px' }}>
            <DollarOutlined style={{ fontSize: '32px', color: 'var(--color-primary)', marginBottom: '12px' }} />
            <Title level={4}>{t('applySeller.benefit2Title', '低佣金')}</Title>
            <Paragraph type="secondary">{t('applySeller.benefit2Desc', '行业最低费率')}</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable style={{ textAlign: 'center', padding: '16px' }}>
            <ShopOutlined style={{ fontSize: '32px', color: 'var(--color-primary)', marginBottom: '12px' }} />
            <Title level={4}>{t('applySeller.benefit3Title', '快速结算')}</Title>
            <Paragraph type="secondary">{t('applySeller.benefit3Desc', 'T+1 快速到账')}</Paragraph>
          </Card>
        </Col>
      </Row>

      <Card title={t('applySeller.formTitle', '申请表单')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item 
                label={t('applySeller.shopName', '店铺名称')} 
                name="shopName" 
                rules={[{ required: true }]}
              >
                <Input placeholder={t('applySeller.shopNamePlaceholder', '请输入店铺名称')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label={t('applySeller.email', '联系邮箱')} 
                name="email" 
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder={t('applySeller.emailPlaceholder', '请输入邮箱')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label={t('applySeller.telegram', 'Telegram')} name="telegram">
                <Input placeholder={t('applySeller.telegramPlaceholder', '请输入 Telegram 用户名')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label={t('applySeller.platforms', '经营平台')} name="platforms">
                <Checkbox.Group>
                  <Row>
                    <Col span={8}><Checkbox value="TikTok">TikTok</Checkbox></Col>
                    <Col span={8}><Checkbox value="Instagram">Instagram</Checkbox></Col>
                    <Col span={8}><Checkbox value="Facebook">Facebook</Checkbox></Col>
                    <Col span={8}><Checkbox value="Telegram">Telegram</Checkbox></Col>
                    <Col span={8}><Checkbox value="Twitter">Twitter</Checkbox></Col>
                    <Col span={8}><Checkbox value="Other">{t('common.other', '其他')}</Checkbox></Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t('applySeller.description', '补充说明')} name="description">
            <Input.TextArea 
              rows={4} 
              placeholder={t('applySeller.descriptionPlaceholder', '请描述您的货源情况、日均出货量等')} 
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              {t('applySeller.submit', '提交申请')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
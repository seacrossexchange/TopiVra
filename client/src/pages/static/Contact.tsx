import { Row, Col, Typography, Form, Input, Button, Collapse, message } from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './Contact.css';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ContactFormValues {
  name?: string;
  email: string;
  content: string;
}



export default function Contact() {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const FAQ_ITEMS = [
    { key: '1', label: t('faq.q1'), children: t('faq.a1') },
    { key: '2', label: t('faq.q2'), children: t('faq.a2') },
    { key: '3', label: t('faq.q3'), children: t('faq.a3') },
    { key: '4', label: t('faq.q4'), children: t('faq.a4') },
    { key: '5', label: t('faq.q5'), children: t('faq.a5') },
    { key: '6', label: t('faq.q6'), children: t('faq.a6') },
  ];

  const handleSubmit = (values: ContactFormValues) => {
    void values;
    message.success(t('contact.messageSuccess'));
    form.resetFields();
  };

  return (
    <div className="contact-page">

      {/* Header */}
      <div className="contact-header">
        <Title level={2} className="title">{t('contact.title')}</Title>
        <Paragraph className="subtitle">
          {t('contact.subtitle', '我们随时为您提供帮助')}
        </Paragraph>
      </div>

      {/* Contact Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 40 }}>
        <Col xs={24} md={8}>
          <div className="contact-card">
            <RobotOutlined className="icon" />
            <Title level={4} className="card-title">{t('contact.telegramBot')}</Title>
            <Paragraph className="card-desc">
              {t('contact.telegramBotDesc')}
            </Paragraph>
            <a href="https://t.me/topivra_bot" target="_blank" rel="noopener noreferrer" className="card-link">
              {t('contact.openChat')}
            </a>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div className="contact-card">
            <SendOutlined className="icon" />
            <Title level={4} className="card-title">{t('contact.telegramChannel')}</Title>
            <Paragraph className="card-desc">
              {t('contact.telegramChannelDesc')}
            </Paragraph>
            <a href="https://t.me/topivra" target="_blank" rel="noopener noreferrer" className="card-link">
              {t('contact.joinChannel')}
            </a>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div className="contact-card">
            <MailOutlined className="icon" />
            <Title level={4} className="card-title">{t('contact.emailSupport')}</Title>
            <Paragraph className="card-desc">
              support@topivra.com
            </Paragraph>
            <a href="mailto:support@topivra.com" className="card-link">
              {t('contact.sendEmail')}
            </a>
          </div>
        </Col>
      </Row>

      {/* Message Form + FAQ */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <div className="contact-form-container">
            <Title level={4} className="form-title">
              {t('contact.messageForm')}
            </Title>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item label={<span className="form-label">{t('contact.name')}</span>} name="name">
                <Input
                  placeholder={t('contact.namePlaceholder')}
                  className="form-input"
                />
              </Form.Item>
              <Form.Item
                label={<span className="form-label">{t('auth.email')}</span>}
                name="email"
                rules={[{ required: true, message: t('auth.emailRequired') }]}
              >
                <Input
                  placeholder={t('contact.emailPlaceholder')}
                  className="form-input"
                />
              </Form.Item>
              <Form.Item
                label={<span className="form-label">{t('contact.content')}</span>}
                name="content"
                rules={[{ required: true, message: t('contact.contentRequired') }]}
              >
                <TextArea
                  rows={4}
                  placeholder={t('contact.contentPlaceholder')}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  className="submit-btn"
                >
                  {t('contact.submitMessage')}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="contact-faq-container">
            <Title level={4} className="faq-title">
              {t('faq.title')}
            </Title>
            <Collapse
              ghost
              items={FAQ_ITEMS.map((item) => ({
                key: item.key,
                label: item.label,
                children: <p style={{ margin: 0, lineHeight: 1.7 }}>{item.children}</p>,
              }))}
              style={{ background: 'transparent' }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
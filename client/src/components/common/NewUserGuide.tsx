import { useState } from 'react';
import { Modal, Button, Space, Tag, Typography, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import './NewUserGuide.css';

const { Title, Text } = Typography;

interface NewUserGuideProps {
  visible: boolean;
  onClose: () => void;
}

export default function NewUserGuide({ visible, onClose }: NewUserGuideProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [couponCode, setCouponCode] = useState('');

  const steps = [
    {
      title: t('guide.welcome.title'),
      description: t('guide.welcome.desc'),
      icon: '👋',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🎉</div>
          <Title level={3}>{t('guide.welcome.title')}</Title>
          <Text type="secondary">
            {t('guide.welcome.detail')}
          </Text>
          <div className="guide-features">
            <div className="guide-feature-item">
              <span className="guide-feature-icon">🔒</span>
              <span>{t('guide.welcome.feature1')}</span>
            </div>
            <div className="guide-feature-item">
              <span className="guide-feature-icon">⚡</span>
              <span>{t('guide.welcome.feature2')}</span>
            </div>
            <div className="guide-feature-item">
              <span className="guide-feature-icon">✅</span>
              <span>{t('guide.welcome.feature3')}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('guide.security.title'),
      description: t('guide.security.desc'),
      icon: '🔒',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🛡️</div>
          <Title level={3}>{t('guide.security.title')}</Title>
          <div className="guide-security-list">
            <div className="guide-security-item">
              <div className="guide-security-icon">💰</div>
              <div>
                <Text strong>{t('guide.security.escrow')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.escrowDesc')}</Text>
              </div>
            </div>
            <div className="guide-security-item">
              <div className="guide-security-icon">⚡</div>
              <div>
                <Text strong>{t('guide.security.auto')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.autoDesc')}</Text>
              </div>
            </div>
            <div className="guide-security-item">
              <div className="guide-security-icon">🔄</div>
              <div>
                <Text strong>{t('guide.security.refund')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.refundDesc')}</Text>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('guide.gift.title'),
      description: t('guide.gift.desc'),
      icon: '🎁',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🎁</div>
          <Title level={3}>{t('guide.gift.title')}</Title>
          <div className="guide-coupon-card">
            <div className="guide-coupon-left">
              <div className="guide-coupon-value">10%</div>
              <div className="guide-coupon-label">{t('guide.gift.discount')}</div>
            </div>
            <div className="guide-coupon-right">
              <Text strong className="guide-coupon-title">{t('guide.gift.couponTitle')}</Text>
              <Text type="secondary" className="guide-coupon-desc">
                {t('guide.gift.couponDesc')}
              </Text>
              {couponCode && (
                <div className="guide-coupon-code">
                  <Tag color="red">{couponCode}</Tag>
                  <Text type="secondary">{t('guide.gift.autoApplied')}</Text>
                </div>
              )}
            </div>
          </div>
          <Text type="secondary" className="guide-gift-note">
            {t('guide.gift.note')}
          </Text>
        </div>
      ),
    },
  ];

  async function claimNewUserCoupon() {
    try {
      const response = await apiClient.post('/coupons/claim-new-user');
      if (response.data?.code) {
        setCouponCode(response.data.code);
      }
    } catch {
      // 静默失败，不影响引导流程
    }
  }


  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (visible && nextStep === 2 && !couponCode) {
        void claimNewUserCoupon();
      }
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // 标记用户已完成引导
    localStorage.setItem('hasSeenGuide', 'true');
    onClose();
    message.success(t('guide.complete'));
  };

  const currentStepData = steps[currentStep];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      closeIcon={<CloseOutlined />}
      className="new-user-guide-modal"
    >
      <div className="guide-container">
        {/* 进度指示器 */}
        <div className="guide-progress">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`guide-progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* 内容区域 */}
        <div className="guide-content">
          {currentStepData.content}
        </div>

        {/* 底部按钮 */}
        <div className="guide-footer">
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                {t('guide.prev')}
              </Button>
            )}
            <Button type="primary" onClick={handleNext}>
              {currentStep < steps.length - 1 ? t('guide.next') : t('guide.start')}
            </Button>
          </Space>
          <Button type="link" onClick={handleFinish}>
            {t('guide.skip')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}







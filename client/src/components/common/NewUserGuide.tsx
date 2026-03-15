import { useState, useEffect } from 'react';
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
      title: t('guide.welcome.title', '欢迎来到 TopiVra'),
      description: t('guide.welcome.desc', '全球领先的社交账号交易平台'),
      icon: '👋',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🎉</div>
          <Title level={3}>{t('guide.welcome.title', '欢迎来到 TopiVra')}</Title>
          <Text type="secondary">
            {t('guide.welcome.detail', '我们提供安全、快速、有保障的社交账号交易服务')}
          </Text>
          <div className="guide-features">
            <div className="guide-feature-item">
              <span className="guide-feature-icon">🔒</span>
              <span>{t('guide.welcome.feature1', '平台担保交易')}</span>
            </div>
            <div className="guide-feature-item">
              <span className="guide-feature-icon">⚡</span>
              <span>{t('guide.welcome.feature2', '24H 自动发货')}</span>
            </div>
            <div className="guide-feature-item">
              <span className="guide-feature-icon">✅</span>
              <span>{t('guide.welcome.feature3', '7天质保服务')}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('guide.security.title', '安全保障'),
      description: t('guide.security.desc', '您的资金和账号安全是我们的首要任务'),
      icon: '🔒',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🛡️</div>
          <Title level={3}>{t('guide.security.title', '安全保障')}</Title>
          <div className="guide-security-list">
            <div className="guide-security-item">
              <div className="guide-security-icon">💰</div>
              <div>
                <Text strong>{t('guide.security.escrow', '资金托管')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.escrowDesc', '支付后资金由平台托管，确认收货后才释放给卖家')}</Text>
              </div>
            </div>
            <div className="guide-security-item">
              <div className="guide-security-icon">⚡</div>
              <div>
                <Text strong>{t('guide.security.auto', '自动发货')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.autoDesc', '支付成功后立即自动发货，无需等待')}</Text>
              </div>
            </div>
            <div className="guide-security-item">
              <div className="guide-security-icon">🔄</div>
              <div>
                <Text strong>{t('guide.security.refund', '退款保障')}</Text>
                <br />
                <Text type="secondary">{t('guide.security.refundDesc', '7天内如有问题可申请退款，快速处理')}</Text>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('guide.gift.title', '新人礼包'),
      description: t('guide.gift.desc', '首单立减 10%'),
      icon: '🎁',
      content: (
        <div className="guide-step-content">
          <div className="guide-icon-large">🎁</div>
          <Title level={3}>{t('guide.gift.title', '新人专属礼包')}</Title>
          <div className="guide-coupon-card">
            <div className="guide-coupon-left">
              <div className="guide-coupon-value">10%</div>
              <div className="guide-coupon-label">{t('guide.gift.discount', '折扣')}</div>
            </div>
            <div className="guide-coupon-right">
              <Text strong className="guide-coupon-title">{t('guide.gift.couponTitle', '新用户首单优惠')}</Text>
              <Text type="secondary" className="guide-coupon-desc">
                {t('guide.gift.couponDesc', '首单立减 10%，最高优惠 $50')}
              </Text>
              {couponCode && (
                <div className="guide-coupon-code">
                  <Tag color="red">{couponCode}</Tag>
                  <Text type="secondary">{t('guide.gift.autoApplied', '已自动领取')}</Text>
                </div>
              )}
            </div>
          </div>
          <Text type="secondary" className="guide-gift-note">
            {t('guide.gift.note', '优惠券已自动添加到您的账户，结算时可使用')}
          </Text>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (visible && currentStep === 2) {
      // 自动领取新用户优惠券
      claimNewUserCoupon();
    }
  }, [visible, currentStep]);

  const claimNewUserCoupon = async () => {
    try {
      const response = await apiClient.post('/coupons/claim-new-user');
      if (response.data?.code) {
        setCouponCode(response.data.code);
      }
    } catch (error) {
      // 静默失败，不影响引导流程
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
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
    message.success(t('guide.complete', '欢迎加入 TopiVra！'));
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
                {t('guide.prev', '上一步')}
              </Button>
            )}
            <Button type="primary" onClick={handleNext}>
              {currentStep < steps.length - 1 ? t('guide.next', '下一步') : t('guide.start', '开始购物')}
            </Button>
          </Space>
          <Button type="link" onClick={handleFinish}>
            {t('guide.skip', '跳过引导')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}




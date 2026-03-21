import { useMemo } from 'react';
import { Space, Progress, Tag, Typography } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  key: string;
  test: (password: string) => boolean;
  labelKey: string;
}

const passwordRequirements: PasswordRequirement[] = [
  { key: 'length', test: (p) => p.length >= 8, labelKey: 'auth.passwordRequirement.length' },
  { key: 'lowercase', test: (p) => /[a-z]/.test(p), labelKey: 'auth.passwordRequirement.lowercase' },
  { key: 'uppercase', test: (p) => /[A-Z]/.test(p), labelKey: 'auth.passwordRequirement.uppercase' },
  { key: 'number', test: (p) => /[0-9]/.test(p), labelKey: 'auth.passwordRequirement.number' },
  { key: 'special', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), labelKey: 'auth.passwordRequirement.special' },
];

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();

  const { score, metRequirements } = useMemo(() => {
    if (!password) {
      return { score: 0, metRequirements: [] };
    }

    const met = passwordRequirements.filter((req) => req.test(password));
    return { score: met.length, metRequirements: met.map((r) => r.key) };
  }, [password]);

  const getStrengthInfo = () => {
    if (score === 0) return { percent: 0, status: 'normal' as const, color: 'var(--color-border)', label: t('auth.passwordStrength.enter') };
    if (score <= 2) return { percent: 20 * score, status: 'exception' as const, color: 'var(--color-error)', label: t('auth.passwordStrength.weak') };
    if (score <= 3) return { percent: 20 * score, status: 'normal' as const, color: 'var(--color-warning)', label: t('auth.passwordStrength.fair') };
    if (score <= 4) return { percent: 20 * score, status: 'active' as const, color: 'var(--color-success)', label: t('auth.passwordStrength.good') };
    return { percent: 100, status: 'success' as const, color: 'var(--color-primary)', label: t('auth.passwordStrength.strong') };
  };

  const strengthInfo = getStrengthInfo();

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <Progress
        percent={strengthInfo.percent}
        status={strengthInfo.status}
        strokeColor={strengthInfo.color}
        showInfo={false}
        size="small"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('auth.passwordStrength.title')}: 
        </Text>
        <Tag color={strengthInfo.color} style={{ margin: 0 }}>
          {strengthInfo.label}
        </Tag>
      </div>
      <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 8 }}>
        {passwordRequirements.map((req) => {
          const isMet = metRequirements.includes(req.key);
          return (
            <div key={req.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isMet ? (
                <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 12 }} />
              ) : (
                <CloseCircleFilled style={{ color: 'var(--color-border)', fontSize: 12 }} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: isMet ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  textDecoration: isMet ? 'none' : 'none',
                }}
              >
                {t(req.labelKey)}
              </Text>
            </div>
          );
        })}
      </Space>
    </div>
  );
}
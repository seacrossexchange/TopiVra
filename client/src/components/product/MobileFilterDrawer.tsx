import { useState, useEffect } from 'react';
import { Drawer, Button, Typography, Divider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface MobileFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  platforms: Array<{ key: string; label: string }>;
  countries: Array<{ code: string; label: string }>;
  selectedPlatform: string;
  selectedCountry: string;
  onPlatformChange: (platform: string) => void;
  onCountryChange: (country: string) => void;
}

export default function MobileFilterDrawer({
  visible,
  onClose,
  platforms,
  countries,
  selectedPlatform,
  selectedCountry,
  onPlatformChange,
  onCountryChange,
}: MobileFilterDrawerProps) {
  const { t } = useTranslation();
  const [tempPlatform, setTempPlatform] = useState(selectedPlatform);
  const [tempCountry, setTempCountry] = useState(selectedCountry);

  // 同步外部状态
  useEffect(() => {
    setTempPlatform(selectedPlatform);
    setTempCountry(selectedCountry);
  }, [selectedPlatform, selectedCountry, visible]);

  const handleApply = () => {
    onPlatformChange(tempPlatform);
    onCountryChange(tempCountry);
    onClose();
  };

  const handleReset = () => {
    setTempPlatform('all');
    setTempCountry('ALL');
  };

  const selectedCount = (tempPlatform !== 'all' ? 1 : 0) + (tempCountry !== 'ALL' ? 1 : 0);

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('products.filter', '筛选')}</span>
          {selectedCount > 0 && (
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-primary)' }}>
              {t('products.selectedCount', '已选')} {selectedCount}
            </span>
          )}
        </div>
      }
      placement="bottom"
      height="auto"
      open={visible}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{ body: { paddingBottom: 80 } }}
      footer={
        <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
          <Button block onClick={handleReset} disabled={tempPlatform === 'all' && tempCountry === 'ALL'}>
            {t('products.reset', '重置')}
          </Button>
          <Button type="primary" block onClick={handleApply}>
            {t('products.apply', '确定')} {selectedCount > 0 && `(${selectedCount})`}
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
          {t('products.platform', '平台')}
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div
            style={{
              padding: '8px 16px',
              border: `1.5px solid ${tempPlatform === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 8,
              background: tempPlatform === 'all' ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
              color: tempPlatform === 'all' ? 'var(--color-primary)' : 'inherit',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: tempPlatform === 'all' ? 600 : 400,
              transition: 'all 0.2s',
            }}
            onClick={() => setTempPlatform('all')}
          >
            {t('products.allProducts', '全部')}
          </div>
          {platforms.map((platform) => (
            <div
              key={platform.key}
              style={{
                padding: '8px 16px',
                border: `1.5px solid ${tempPlatform === platform.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 8,
                background: tempPlatform === platform.key ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
                color: tempPlatform === platform.key ? 'var(--color-primary)' : 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tempPlatform === platform.key ? 600 : 400,
                transition: 'all 0.2s',
              }}
              onClick={() => setTempPlatform(platform.key)}
            >
              {platform.label}
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '20px 0' }} />

      <div>
        <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
          {t('products.country', '国家/地区')}
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countries.map((country) => (
            <div
              key={country.code}
              style={{
                padding: '8px 16px',
                border: `1.5px solid ${tempCountry === country.code ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 8,
                background: tempCountry === country.code ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
                color: tempCountry === country.code ? 'var(--color-primary)' : 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tempCountry === country.code ? 600 : 400,
                transition: 'all 0.2s',
              }}
              onClick={() => setTempCountry(country.code)}
            >
              {country.label}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}


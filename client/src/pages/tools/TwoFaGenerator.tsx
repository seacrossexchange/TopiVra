import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Input, Button, Typography, Space, message } from 'antd';
import { SafetyCertificateOutlined, CopyOutlined } from '@ant-design/icons';
import { useSeo } from '@/hooks/useSeo';
import './TwoFaGenerator.css';

const { Title, Paragraph, Text } = Typography;

// Base32 解码
function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = str.replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  
  for (let i = 0; i < cleanStr.length; i++) {
    const idx = alphabet.indexOf(cleanStr[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
  }
  
  const bytes: number[] = [];
  for (let j = bits - 8; j >= 0; j -= 8) {
    bytes.push((value >> j) & 255);
  }
  
  return new Uint8Array(bytes);
}

// HMAC-Based One-Time Password 算法
async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const h = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    h[i] = c & 255;
    c = Math.floor(c / 256);
  }
  
  const key = await crypto.subtle.importKey(
    'raw',
    secret.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, h);
  const s = new Uint8Array(sig);
  const offset = s[19] & 15;
  const code = ((s[offset] & 127) << 24) | (s[offset + 1] << 16) | (s[offset + 2] << 8) | s[offset + 3];
  
  return (code % 1000000).toString().padStart(6, '0');
}

export default function TwoFaGenerator() {
  const { t } = useTranslation();
  const [secret, setSecret] = useState('');
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useSeo({
    title: '2FA 验证码生成器 | TopiVra',
    description: '在线 TOTP 验证码生成工具，输入密钥即可生成 6 位动态验证码。本地计算，安全可靠。',
    keywords: ['2FA', 'TOTP', '验证码生成器', '双因素认证', 'Google Authenticator'],
  });

  const generateCode = useCallback(async (secretKey: string) => {
    if (!secretKey.trim()) {
      setError(t('tools.2fa.errorEmpty'));
      setCode('');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const bytes = base32Decode(secretKey);
      const counter = Math.floor(Date.now() / 30000);
      const newCode = await hotp(bytes, counter);
      setCode(newCode);
    } catch {
      setError(t('tools.2fa.errorInvalid'));
      setCode('');
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  // 倒计时和自动刷新
  useEffect(() => {
    if (!code) return;

    const timer = setInterval(() => {
      const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
      setCountdown(secondsLeft);

      // 当倒计时重置时自动刷新验证码
      if (secondsLeft === 30 && secret) {
        generateCode(secret);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [code, secret, generateCode]);

  const handleGenerate = () => {
    generateCode(secret);
  };

  const handleCopy = async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        message.success(t('tools.2fa.copied'));
      } catch {
        message.error(t('common.copyFailed'));
      }
    }
  };

  const progressPercent = (countdown / 30) * 100;

  return (
    <div className="twofa-page">
      <div className="twofa-container">
        {/* Header */}
        <div className="twofa-header">
          <SafetyCertificateOutlined className="twofa-header-icon" />
          <Title level={2}>{t('tools.2fa.title')}</Title>
          <Paragraph className="twofa-subtitle">
            {t('tools.2fa.subtitle')}
          </Paragraph>
        </div>

        {/* Main Card */}
        <Card className="twofa-card">
          <Space direction="vertical" size="large" className="twofa-form">
            {/* Secret Input */}
            <div className="twofa-input-group">
              <label className="twofa-label">{t('tools.2fa.secretKey')}</label>
              <Input
                placeholder={t('tools.2fa.secretPlaceholder')}
                value={secret}
                onChange={(e) => setSecret(e.target.value.toUpperCase())}
                onPressEnter={handleGenerate}
                className="twofa-input"
                autoComplete="off"
              />
            </div>

            {/* Account Input */}
            <div className="twofa-input-group">
              <label className="twofa-label">{t('tools.2fa.accountName')}</label>
              <Input
                placeholder={t('tools.2fa.accountPlaceholder')}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="twofa-input"
                autoComplete="off"
              />
            </div>

            {/* Generate Button */}
            <Button
              type="primary"
              size="large"
              onClick={handleGenerate}
              loading={isGenerating}
              icon={<SafetyCertificateOutlined />}
              className="twofa-generate-btn"
            >
              {t('tools.2fa.generate')}
            </Button>

            {/* Error Message */}
            {error && (
              <div className="twofa-error">
                <Text type="danger">{error}</Text>
              </div>
            )}

            {/* Result */}
            {code && (
              <div className="twofa-result">
                <div className="twofa-code-display">
                  <span className="twofa-code">{code.slice(0, 3)}</span>
                  <span className="twofa-code-separator"> </span>
                  <span className="twofa-code">{code.slice(3)}</span>
                </div>

                {/* Countdown */}
                <div className="twofa-countdown">
                  <Text type="secondary">
                    {t('tools.2fa.refreshIn')} <strong>{countdown}</strong>s
                  </Text>
                  <div className="twofa-progress">
                    <div 
                      className="twofa-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Copy Button */}
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopy}
                  className="twofa-copy-btn"
                >
                  {t('tools.2fa.copy')}
                </Button>
              </div>
            )}
          </Space>
        </Card>

        {/* Info Card */}
        <Card className="twofa-info-card">
          <Title level={4}>{t('tools.2fa.infoTitle')}</Title>
          <ul className="twofa-info-list">
            <li>{t('tools.2fa.info1')}</li>
            <li>{t('tools.2fa.info2')}</li>
            <li>{t('tools.2fa.info3')}</li>
            <li>{t('tools.2fa.info4')}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
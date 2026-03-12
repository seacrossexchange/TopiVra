import { useState } from 'react';
import { Form, Input, Button, Avatar, Upload, message, Card, Divider, Switch, Tabs, Modal } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, UploadOutlined, SafetyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import type { UploadProps } from 'antd';
import apiClient from '@/services/apiClient';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { user, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaModal, setTwoFaModal] = useState<'enable' | 'disable' | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaQrUrl, setTwoFaQrUrl] = useState('');

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.patch('/auth/profile', values);
      message.success(t('user.profileUpdateSuccess'));
      // 重新获取用户信息
      await fetchUser();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.profileUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 开启 2FA：请求二维码
  const handleEnable2FA = async () => {
    setTwoFaLoading(true);
    try {
      const { data } = await apiClient.post('/auth/2fa/generate');
      setTwoFaSecret(data.secret);
      setTwoFaQrUrl(data.qrCodeUrl);
      setTwoFaCode('');
      setTwoFaModal('enable');
    } catch {
      message.error(t('user.twoFactorEnableFailed', '开启失败，请稍后重试'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  // 验证并确认开启 2FA
  const handleConfirmEnable2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      message.warning(t('user.twoFactorCodeRequired', '请输入6位验证码'));
      return;
    }
    setTwoFaLoading(true);
    try {
      await apiClient.post('/auth/2fa/enable', { secret: twoFaSecret, token: twoFaCode });
      message.success(t('user.twoFactorEnabled', '两步验证已开启'));
      setTwoFaModal(null);
      await fetchUser();
    } catch {
      message.error(t('user.twoFactorCodeInvalid', '验证码错误，请重新扫码'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  // 关闭 2FA
  const handleDisable2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      message.warning(t('user.twoFactorCodeRequired', '请输入当前验证码'));
      return;
    }
    setTwoFaLoading(true);
    try {
      await apiClient.post('/auth/2fa/disable', { token: twoFaCode });
      message.success(t('user.twoFactorDisabled', '两步验证已关闭'));
      setTwoFaModal(null);
      await fetchUser();
    } catch {
      message.error(t('user.twoFactorCodeInvalid', '验证码错误'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success(t('user.passwordChangeSuccess'));
    } catch (error: any) {
      message.error(error.response?.data?.message || t('user.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error(t('user.uploadImageOnly'));
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error(t('user.imageSizeLimit'));
        return false;
      }
      
      // 将图片转换为base64并更新
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          await apiClient.patch('/auth/profile', { avatar: base64 });
          message.success('头像更新成功');
          await fetchUser();
        } catch (error: any) {
          message.error(error.response?.data?.message || '头像更新失败');
        }
      };
      reader.readAsDataURL(file);
      
      return false;
    },
  };

  const items = [
    {
      key: 'info',
      label: t('user.basicInfo'),
      children: (
        <Form
          layout="vertical"
          initialValues={{
            username: user?.username,
            email: user?.email,
            phone: user?.phone,
          }}
          onFinish={handleUpdateProfile}
        >
          <Form.Item label={t('user.avatar')}>
            <Upload {...uploadProps}>
              <div className="profile__avatar-upload">
                <Avatar size={80} src={user?.avatar} icon={<UserOutlined />} />
                <div className="profile__avatar-upload-text">
                  <UploadOutlined /> {t('user.changeAvatar')}
                </div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="username"
            label={t('user.username')}
            rules={[{ required: true, message: t('user.usernameRequired') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('user.usernameRequired')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('user.email')}
            rules={[
              { required: true, message: t('user.emailRequired') },
              { type: 'email', message: t('user.emailInvalid') },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder={t('user.emailRequired')} disabled />
          </Form.Item>

          <Form.Item name="phone" label={t('user.phone')}>
            <Input prefix={<PhoneOutlined />} placeholder={t('user.phonePlaceholder')} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('user.saveChanges')}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'security',
      label: t('user.securitySettings'),
      children: (
        <div className="profile__security">
          <Card title={t('user.changePassword')} className="profile__security-card">
            <Form layout="vertical" onFinish={handleChangePassword}>
              <Form.Item
                name="oldPassword"
                label={t('user.currentPassword')}
                rules={[{ required: true, message: t('user.currentPasswordRequired') }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('user.currentPasswordRequired')} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={t('user.newPassword')}
                rules={[
                  { required: true, message: t('user.newPasswordRequired') },
                  { min: 8, message: t('user.passwordMinLength') },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('user.newPasswordRequired')} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={t('user.confirmPassword')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('user.confirmPasswordRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t('user.passwordMismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('user.confirmPasswordRequired')} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {t('user.changePassword')}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Divider />

          <Card title={t('user.twoFactorAuth')} className="profile__security-card">
            <div className="profile__2fa">
              <div className="profile__2fa-info">
                <p>{t('user.twoFactorDesc')}</p>
                <p>{t('user.twoFactorStatus')}：
                  {user?.twoFactorEnabled
                    ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{t('user.twoFactorEnabled')}</span>
                    : <span style={{ color: 'var(--color-text-secondary)' }}>{t('user.twoFactorDisabled')}</span>}
                </p>
              </div>
              <Switch
                checked={!!user?.twoFactorEnabled}
                loading={twoFaLoading}
                onChange={(checked) => {
                  setTwoFaCode('');
                  if (checked) {
                    handleEnable2FA();
                  } else {
                    setTwoFaModal('disable');
                  }
                }}
              />
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="profile">
      <div className="profile__header">
        <h1>{t('user.profile')}</h1>
        <p>{t('user.profileDesc')}</p>
      </div>

      <Card className="profile__content">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>

      {/* 开启 2FA 弹窗 */}
      <Modal
        title={<span><SafetyOutlined style={{ marginRight: 8, color: 'var(--color-accent)' }} />{t('user.enable2FA', '开启两步验证')}</span>}
        open={twoFaModal === 'enable'}
        onCancel={() => setTwoFaModal(null)}
        onOk={handleConfirmEnable2FA}
        confirmLoading={twoFaLoading}
        okText={t('user.confirm2FA', '确认开启')}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ marginBottom: 8 }}>{t('user.scan2FAQr', '请使用 Google Authenticator 扫描二维码')}</p>
          {twoFaQrUrl && <img src={twoFaQrUrl} alt="2FA QR" style={{ width: 180, height: 180, border: '1px solid #eee', borderRadius: 8 }} />}
          <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
            {t('user.manualSecret', '手动输入密钥')}: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{twoFaSecret}</code>
          </p>
        </div>
        <Input
          placeholder={t('user.enter2FACode', '输入6位验证码')}
          value={twoFaCode}
          onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          size="large"
          style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
        />
      </Modal>

      {/* 关闭 2FA 弹窗 */}
      <Modal
        title={<span><SafetyOutlined style={{ marginRight: 8, color: 'var(--color-warning)' }} />{t('user.disable2FA', '关闭两步验证')}</span>}
        open={twoFaModal === 'disable'}
        onCancel={() => setTwoFaModal(null)}
        onOk={handleDisable2FA}
        confirmLoading={twoFaLoading}
        okText={t('user.confirmDisable2FA', '确认关闭')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('user.disable2FADesc', '关闭两步验证会降低账号安全性，请输入当前验证器中的验证码确认：')}</p>
        <Input
          placeholder={t('user.enter2FACode', '输入6位验证码')}
          value={twoFaCode}
          onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          size="large"
          style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
        />
      </Modal>
    </div>
  );
}
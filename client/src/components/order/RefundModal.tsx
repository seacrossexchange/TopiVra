import { useState } from 'react';
import { Modal, Form, Select, Input, Upload, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from 'antd/es/upload/interface';
import apiClient from '@/services/apiClient';

interface RefundModalProps {
  open: boolean;
  orderId: string;
  orderNo: string;
  orderAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const REFUND_REASONS = [
  { value: 'PRODUCT_NOT_MATCH', label: '商品与描述不符' },
  { value: 'ACCOUNT_ABNORMAL', label: '账号无法登录/异常' },
  { value: 'NOT_DELIVERED', label: '未收到账号凭证' },
  { value: 'ACCOUNT_BANNED', label: '账号已被封禁' },
  { value: 'WRONG_INFO', label: '登录信息错误' },
  { value: 'OTHER', label: '其他原因' },
];

export default function RefundModal({
  open,
  orderId,
  orderNo,
  orderAmount,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 先上传图片（如果有）
      let evidenceUrls: string[] = [];
      if (fileList.length > 0) {
        const uploadPromises = fileList.map(async (file) => {
          if (file.originFileObj) {
            const formData = new FormData();
            formData.append('file', file.originFileObj);
            const response = await apiClient.post('/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data?.url || response.data?.path;
          }
          return null;
        });
        const results = await Promise.all(uploadPromises);
        evidenceUrls = results.filter(Boolean) as string[];
      }

      // 提交退款申请
      await apiClient.post(`/orders/${orderId}/refund-request`, {
        reasonType: values.reasonType,
        reason: values.reason,
        evidence: evidenceUrls,
      });

      message.success(t('refund.submitSuccess', '退款申请已提交，我们将在24小时内审核'));
      form.resetFields();
      setFileList([]);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(errorMessage || t('refund.submitFailed', '提交失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('refund.onlyImage', '只能上传图片文件'));
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('refund.imageSizeLimit', '图片大小不能超过 5MB'));
      return false;
    }
    return false; // 阻止自动上传，我们手动处理
  };

  return (
    <Modal
      title={t('refund.title', '申请退款')}
      open={open}
      onCancel={handleClose}
      width={520}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {t('common.cancel', '取消')}
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {t('refund.submit', '提交申请')}
        </Button>,
      ]}
    >
      <div className="refund-modal-content">
        <div className="refund-order-info">
          <div className="info-row">
            <span className="label">{t('refund.orderNo', '订单号')}:</span>
            <span className="value">{orderNo}</span>
          </div>
          <div className="info-row">
            <span className="label">{t('refund.orderAmount', '订单金额')}:</span>
            <span className="value amount">${orderAmount.toFixed(2)}</span>
          </div>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="reasonType"
            label={t('refund.reasonType', '退款原因')}
            rules={[{ required: true, message: t('refund.reasonTypeRequired', '请选择退款原因') }]}
          >
            <Select
              placeholder={t('refund.selectReason', '请选择退款原因')}
              options={REFUND_REASONS.map(item => ({
                value: item.value,
                label: t(`refund.reasons.${item.value}`, item.label),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label={t('refund.detailReason', '详细说明')}
            rules={[
              { required: true, message: t('refund.reasonRequired', '请输入详细说明') },
              { max: 500, message: t('refund.reasonMaxLength', '最多输入500字') },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={t('refund.reasonPlaceholder', '请详细描述您的问题...')}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label={t('refund.evidence', '证据截图（可选）')}>
            <div className="evidence-upload">
              <Upload
                listType="picture-card"
                fileList={fileList}
                beforeUpload={beforeUpload}
                onChange={({ fileList }) => setFileList(fileList.slice(0, 3))}
                maxCount={3}
                accept="image/*"
              >
                {fileList.length < 3 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>{t('refund.upload', '上传')}</div>
                  </div>
                )}
              </Upload>
              <div className="upload-tip">
                {t('refund.uploadTip', '最多上传3张图片，每张不超过5MB')}
              </div>
            </div>
          </Form.Item>
        </Form>

        <div className="refund-tips">
          <h4>{t('refund.tips.title', '退款说明')}</h4>
          <ul>
            <li>{t('refund.tips.tip1', '⏱ 审核时间：24小时内处理')}</li>
            <li>{t('refund.tips.tip2', '💰 退款方式：原路返回至账户余额')}</li>
            <li>{t('refund.tips.tip3', '📞 如有疑问：联系在线客服')}</li>
            <li>{t('refund.tips.tip4', '⚠️ C2C交易：退款需卖家同意，平台将协调处理')}</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
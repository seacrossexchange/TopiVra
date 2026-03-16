import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Tag, Progress } from 'antd';
import { EditOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useI18n } from '@/hooks/useI18n';
import axios from 'axios';

const { TextArea } = Input;

interface Translation {
  id?: string;
  language: string;
  title?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface TranslationCompletenessProps {
  entityType: 'product' | 'category' | 'blog';
  entityId: string;
}

export default function TranslationManager({ entityType, entityId }: TranslationCompletenessProps) {
  const { t } = useI18n();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [completeness, setCompleteness] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [form] = Form.useForm();

  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'es-MX', name: 'Español', flag: '🇲🇽' },
  ];

  useEffect(() => {
    loadTranslations();
  }, [entityType, entityId]);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/translations/${entityType}/${entityId}`);
      setTranslations(response.data.data.translations);
      setCompleteness(response.data.data.completeness);
    } catch {
      message.error(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (language: string) => {
    const translation = translations.find(t => t.language === language);
    setEditingLanguage(language);
    
    if (translation) {
      form.setFieldsValue(translation);
    } else {
      form.resetFields();
    }
    
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      await axios.put(
        `/api/translations/${entityType}/${entityId}/${editingLanguage}`,
        values,
      );
      
      message.success(t('common.saveSuccess'));
      setEditModalVisible(false);
      loadTranslations();
    } catch {
      message.error(t('common.saveFailed'));
    }
  };

  const columns = [
    {
      title: t('admin.language'),
      dataIndex: 'language',
      key: 'language',
      render: (lang: string) => {
        const langInfo = languages.find(l => l.code === lang);
        return (
          <span>
            {langInfo?.flag} {langInfo?.name}
          </span>
        );
      },
    },
    {
      title: t('admin.status'),
      key: 'status',
      render: (_: any, record: Translation) => {
        const exists = translations.some(t => t.language === record.language);
        return exists ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {t('admin.translated')}
          </Tag>
        ) : (
          <Tag icon={<WarningOutlined />} color="warning">
            {t('admin.missing')}
          </Tag>
        );
      },
    },
    {
      title: t('admin.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record.language)}
        >
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  // 生成所有语言的数据（包括缺失的）
  const tableData = languages.map(lang => {
    const translation = translations.find(t => t.language === lang.code);
    return {
      language: lang.code,
      ...translation,
    };
  });

  return (
    <Card title={t('admin.translationManagement')}>
      {completeness && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{t('admin.completeness')}:</strong> {completeness.completeness.toFixed(0)}%
          </div>
          <Progress 
            percent={completeness.completeness} 
            status={completeness.complete ? 'success' : 'active'}
          />
          {completeness.missingLanguages.length > 0 && (
            <div style={{ marginTop: 8, color: '#faad14' }}>
              <WarningOutlined /> {t('admin.missingLanguages')}: {completeness.missingLanguages.join(', ')}
            </div>
          )}
        </div>
      )}

      <Table
        columns={columns}
        dataSource={tableData}
        rowKey="language"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={t('admin.editTranslation')}
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('admin.title')}
            name="title"
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t('admin.description')}
            name="description"
            rules={[{ required: true, message: t('common.required') }]}
          >
            <TextArea rows={6} />
          </Form.Item>

          <Form.Item
            label={t('admin.metaTitle')}
            name="metaTitle"
          >
            <Input placeholder={t('admin.seoOptional')} />
          </Form.Item>

          <Form.Item
            label={t('admin.metaDescription')}
            name="metaDescription"
          >
            <TextArea rows={3} placeholder={t('admin.seoOptional')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}






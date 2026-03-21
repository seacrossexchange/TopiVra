import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Input, Select, Switch,
  InputNumber, Drawer, message, Popconfirm, Typography, Tooltip, Upload,
  Divider
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, TagOutlined,
  UploadOutlined, FileZipOutlined, LinkOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/services/apiClient';
import { setPromotion } from '@/services/sellers';
import PromotionModal from '@/components/seller/PromotionModal';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;
const { TextArea } = Input;

type ProductType = 'ACCOUNT' | 'SOFTWARE' | 'DIGITAL';

type DeliveryType = 'FILE' | 'LINK' | 'KEY' | 'HYBRID';

type CountryMode = 'NONE' | 'SINGLE' | 'MULTI';

// 适用系统
const SUPPORTED_SYSTEMS = [
  { value: 'Windows', label: 'Windows' },
  { value: 'macOS', label: 'macOS' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Android', label: 'Android' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Web', label: 'Web' },
];

// 国家列表（常用）
const COUNTRIES = [
  { value: 'US', label: '美国 (US)' },
  { value: 'GB', label: '英国 (GB)' },
  { value: 'CA', label: '加拿大 (CA)' },
  { value: 'AU', label: '澳大利亚 (AU)' },
  { value: 'JP', label: '日本 (JP)' },
  { value: 'KR', label: '韩国 (KR)' },
  { value: 'SG', label: '新加坡 (SG)' },
  { value: 'MY', label: '马来西亚 (MY)' },
  { value: 'ID', label: '印尼 (ID)' },
  { value: 'TH', label: '泰国 (TH)' },
  { value: 'VN', label: '越南 (VN)' },
  { value: 'PH', label: '菲律宾 (PH)' },
  { value: 'IN', label: '印度 (IN)' },
  { value: 'BR', label: '巴西 (BR)' },
  { value: 'MX', label: '墨西哥 (MX)' },
  { value: 'DE', label: '德国 (DE)' },
  { value: 'FR', label: '法国 (FR)' },
  { value: 'ES', label: '西班牙 (ES)' },
  { value: 'IT', label: '意大利 (IT)' },
  { value: 'NL', label: '荷兰 (NL)' },
  { value: 'RU', label: '俄罗斯 (RU)' },
  { value: 'TR', label: '土耳其 (TR)' },
  { value: 'AE', label: '阿联酋 (AE)' },
  { value: 'SA', label: '沙特 (SA)' },
  { value: 'EG', label: '埃及 (EG)' },
  { value: 'NG', label: '尼日利亚 (NG)' },
  { value: 'ZA', label: '南非 (ZA)' },
  { value: 'OTHER', label: '其他' },
];

// 基础商品 Schema
const productSchema = z.object({
  title: z.string().min(2).max(100),
  categoryId: z.string().min(1),
  platform: z.string().min(1),
  price: z.number().min(0.01),
  stock: z.number().int().min(0),
  description: z.string().max(5000).optional(),
  
  // 商品类型相关
  productType: z.enum(['ACCOUNT', 'SOFTWARE', 'DIGITAL']),
  deliveryType: z.enum(['FILE', 'LINK', 'KEY', 'HYBRID']),
  countryMode: z.enum(['NONE', 'SINGLE', 'MULTI']),
  countries: z.array(z.string()).optional(),
  
  // 软件商品专属
  supportedSystems: z.array(z.string()).optional(),
  fileType: z.string().optional(),
  version: z.string().optional(),
  fileSize: z.number().optional(),
  downloadUrl: z.string().optional(),
  installGuide: z.string().optional(),
  updateNote: z.string().optional(),
  
  // 账号商品专属
  followerRange: z.string().optional(),
  loginMethod: z.string().optional(),
  warrantyInfo: z.string().optional(),
  
  // 账号数据/激活码（兼容旧字段）
  accountData: z.string().optional(),
});

type ProductFormValues = z.input<typeof productSchema>;

interface Product {
  id: string;
  title: string;
  categoryId: string;
  category?: { id: string; name: string };
  platform?: string;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';
  sales: number;
  createdAt: string;
  description?: string;
  productType?: ProductType;
  deliveryType?: DeliveryType;
  countryMode?: CountryMode;
  countries?: string[];
  images?: string[];
}

interface Category {
  id: string;
  name: string;
}

export default function SellerProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 平台列表（在组件内定义以使用 t 函数）
  const PLATFORMS = [
    { value: 'TikTok', label: 'TikTok' },
    { value: 'Instagram', label: 'Instagram' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'Telegram', label: 'Telegram' },
    { value: 'Twitter', label: 'Twitter/X' },
    { value: 'YouTube', label: 'YouTube' },
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'Discord', label: 'Discord' },
    { value: 'Gmail', label: 'Gmail' },
    { value: 'Other', label: t('product.otherPlatform', '其他') },
  ];

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [promotionProduct, setPromotionProduct] = useState<Product | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [activationKeys, setActivationKeys] = useState<string>('');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormValues, unknown, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productType: 'ACCOUNT',
      deliveryType: 'FILE',
      countryMode: 'NONE',
      platform: 'TikTok',
      title: '',
      categoryId: '',
      price: 0,
      stock: 0,
    },
  });

  // 监听商品类型变化
  const productType = useWatch({ control, name: 'productType' });
  const deliveryType = useWatch({ control, name: 'deliveryType' });
  const countryMode = useWatch({ control, name: 'countryMode' });

  useEffect(() => {
    if (editingProduct) {
      reset({
        title: editingProduct.title,
        categoryId: editingProduct.categoryId,
        platform: editingProduct.platform || 'TikTok',
        price: editingProduct.price,
        stock: editingProduct.stock,
        description: editingProduct.description || '',
        productType: (editingProduct.productType || 'ACCOUNT') as ProductType,
        deliveryType: (editingProduct.deliveryType || 'FILE') as DeliveryType,
        countryMode: (editingProduct.countryMode || 'NONE') as CountryMode,
        countries: editingProduct.countries || [],
      });
    } else {
      reset({
        title: '',
        categoryId: '',
        platform: 'TikTok',
        price: 0,
        stock: 0,
        description: '',
        productType: 'ACCOUNT',
        deliveryType: 'FILE',
        countryMode: 'NONE',
        countries: [],
      });
    }
  }, [editingProduct, reset]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products', searchText, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await apiClient.get(`/sellers/products?${params}`);
      return response.data as Product[];
    },
    initialData: [],
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data as Category[];
    },
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: z.output<typeof productSchema>) => {
      const payload = {
        ...data,
        images: uploadedImages,
        activationKeys: activationKeys ? activationKeys.split('\n').filter(k => k.trim()) : undefined,
      };
      
      if (editingProduct) {
        return apiClient.patch(`/products/${editingProduct.id}`, payload);
      }
      return apiClient.post('/products', payload);
    },
    onSuccess: () => {
      message.success(editingProduct ? t('common.updateSuccess') : t('common.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setDrawerOpen(false);
      setEditingProduct(null);
      reset();
    },
    onError: () => {
      message.error(t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      message.success(t('common.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiClient.patch(`/products/${id}/status`, { status: active ? 'ACTIVE' : 'INACTIVE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
  });

  const statusColors = {
    ACTIVE: 'green',
    INACTIVE: 'default',
    PENDING: 'orange',
    REJECTED: 'red',
  };

  const columns: ColumnsType<Product> = [
    {
      title: t('product.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: t('product.type', '类型'),
      dataIndex: 'productType',
      key: 'productType',
      render: (type: ProductType) => {
        const typeMap: Record<ProductType, { color: string; text: string }> = {
          ACCOUNT: { color: 'blue', text: t('product.type.account', '账号') },
          SOFTWARE: { color: 'purple', text: t('product.type.software', '软件') },
          DIGITAL: { color: 'cyan', text: t('product.type.digital', '数字资源') },
        };
        const config = typeMap[type] || typeMap.ACCOUNT;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t('product.category'),
      dataIndex: ['category', 'name'],
      key: 'category',
    },
    {
      title: t('product.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: t('product.stock'),
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: t('product.sales'),
      dataIndex: 'sales',
      key: 'sales',
    },
    {
      title: t('product.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {t(`product.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('product.onOff'),
      key: 'toggle',
      render: (_, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, active: checked })}
          disabled={record.status === 'PENDING' || record.status === 'REJECTED'}
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('seller.promotion.title')}>
            <Button
              type="text"
              icon={<TagOutlined />}
              onClick={() => {
                setPromotionProduct(record);
                setPromotionModalOpen(true);
              }}
              disabled={record.status !== 'ACTIVE'}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(record);
                setUploadedImages(record.images || []);
                setUploadedFiles([]);
                setActivationKeys('');
                setDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title={t('common.confirmDelete')}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onSubmit = (data: ProductFormValues) => {
    saveMutation.mutate(data);
  };

  // 渲染商品类型选择
  const renderProductTypeSelector = () => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{t('product.type.label', '商品类型')}</Text>
      <Controller
        name="productType"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            style={{ marginTop: 4, width: '100%' }}
            options={[
              { value: 'ACCOUNT', label: `${t('product.type.account', '账号类商品')} - ${t('product.type.accountDesc', '社交账号、数字账号等')}` },
              { value: 'SOFTWARE', label: `${t('product.type.software', '软件类商品')} - ${t('product.type.softwareDesc', '安装包、脚本、工具等')}` },
              { value: 'DIGITAL', label: `${t('product.type.digital', '数字资源')} - ${t('product.type.digitalDesc', '模板、素材、教程等')}` },
            ]}
          />
        )}
      />
    </div>
  );

  // 渲染交付方式选择
  const renderDeliveryTypeSelector = () => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{t('product.deliveryType', '交付方式')}</Text>
      <Controller
        name="deliveryType"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            style={{ marginTop: 4, width: '100%' }}
            options={[
              { value: 'FILE', label: `${t('product.delivery.file', '文件交付')} - ${t('product.delivery.fileDesc', '上传文件供下载')}` },
              { value: 'LINK', label: `${t('product.delivery.link', '链接交付')} - ${t('product.delivery.linkDesc', '提供下载链接')}` },
              { value: 'KEY', label: `${t('product.delivery.key', '激活码交付')} - ${t('product.delivery.keyDesc', '激活码/卡密自动发货')}` },
              { value: 'HYBRID', label: `${t('product.delivery.hybrid', '混合交付')} - ${t('product.delivery.hybridDesc', '多种方式组合')}` },
            ]}
          />
        )}
      />
    </div>
  );

  // 渲染国家属性配置
  const renderCountrySelector = () => (
    <div style={{ marginBottom: 16 }}>
      <Text strong>{t('product.countryMode', '国家属性')}</Text>
      <Controller
        name="countryMode"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            style={{ marginTop: 4, width: '100%' }}
            options={[
              { value: 'NONE', label: t('product.countryMode.none', '不适用（如软件类商品）') },
              { value: 'SINGLE', label: t('product.countryMode.single', '单国家') },
              { value: 'MULTI', label: t('product.countryMode.multi', '多国家') },
            ]}
          />
        )}
      />
      {countryMode !== 'NONE' && (
        <Controller
          name="countries"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              mode={countryMode === 'MULTI' ? 'multiple' : undefined}
              style={{ marginTop: 8, width: '100%' }}
              placeholder={t('product.selectCountry', '选择国家')}
              options={COUNTRIES}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
        />
      )}
    </div>
  );

  // 渲染账号商品专属字段
  const renderAccountFields = () => (
    <>
      <Divider>{t('product.accountFields', '账号商品信息')}</Divider>
      
      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.platform', '平台')}</Text>
        <Controller
          name="platform"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ marginTop: 4, width: '100%' }}
              options={PLATFORMS}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
        />
      </div>

      {renderCountrySelector()}

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.followerRange', '粉丝量区间')}</Text>
        <Controller
          name="followerRange"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ marginTop: 4, width: '100%' }}
              allowClear
              options={[
                { value: '0-1K', label: '0 - 1K' },
                { value: '1K-5K', label: '1K - 5K' },
                { value: '5K-10K', label: '5K - 10K' },
                { value: '10K-50K', label: '10K - 50K' },
                { value: '50K-100K', label: '50K - 100K' },
                { value: '100K-500K', label: '100K - 500K' },
                { value: '500K-1M', label: '500K - 1M' },
                { value: '1M+', label: '1M+' },
              ]}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.loginMethod', '登录方式')}</Text>
        <Controller
          name="loginMethod"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={2}
              style={{ marginTop: 4 }}
              placeholder={t('product.loginMethodPlaceholder', '例如：邮箱+密码、二步验证等')}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.warrantyInfo', '质保说明')}</Text>
        <Controller
          name="warrantyInfo"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={2}
              style={{ marginTop: 4 }}
              placeholder={t('product.warrantyInfoPlaceholder', '例如：质保7天，出现问题可申请售后')}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.accountData', '账号数据')}</Text>
        <Controller
          name="accountData"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={4}
              style={{ marginTop: 4 }}
              placeholder={t('product.accountDataPlaceholder', '每行一个账号，格式：账号----密码----邮箱（如有）')}
            />
          )}
        />
      </div>
    </>
  );

  // 渲染软件商品专属字段
  const renderSoftwareFields = () => (
    <>
      <Divider>{t('product.softwareFields', '软件商品信息')}</Divider>
      
      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.supportedSystems', '适用系统')}</Text>
        <Controller
          name="supportedSystems"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              mode="multiple"
              style={{ marginTop: 4, width: '100%' }}
              options={SUPPORTED_SYSTEMS}
              placeholder={t('product.selectSystems', '选择支持的操作系统')}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.fileType', '文件类型')}</Text>
        <Controller
          name="fileType"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ marginTop: 4, width: '100%' }}
              allowClear
              options={[
                { value: 'zip', label: 'ZIP 压缩包' },
                { value: 'rar', label: 'RAR 压缩包' },
                { value: '7z', label: '7Z 压缩包' },
                { value: 'exe', label: 'EXE 安装包 (Windows)' },
                { value: 'dmg', label: 'DMG 安装包 (macOS)' },
                { value: 'apk', label: 'APK 安装包 (Android)' },
                { value: 'pdf', label: 'PDF 文档' },
                { value: 'other', label: t('product.otherType', '其他') },
              ]}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.version', '版本号')}</Text>
        <Controller
          name="version"
          control={control}
          render={({ field }) => (
            <Input {...field} style={{ marginTop: 4 }} placeholder="例如：v2.1.0" />
          )}
        />
      </div>

      {renderDeliveryTypeSelector()}

      {(deliveryType === 'FILE' || deliveryType === 'HYBRID') && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('product.fileUpload', '文件上传')}</Text>
          <div style={{ marginTop: 8 }}>
            <Upload
              beforeUpload={() => {
                message.info(t('product.fileUploadHint', '文件上传功能需要配置存储服务'));
                return false;
              }}
              onRemove={(file) => {
                setUploadedFiles(prev => prev.filter(f => f.uid !== file.uid));
              }}
              fileList={uploadedFiles}
            >
              <Button icon={<FileZipOutlined />}>{t('product.selectFile', '选择文件')}</Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              支持 zip, rar, exe, dmg 等格式，最大 100MB
            </Text>
          </div>
        </div>
      )}

      {(deliveryType === 'LINK' || deliveryType === 'HYBRID') && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('product.downloadUrl', '下载链接')}</Text>
          <Controller
            name="downloadUrl"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                style={{ marginTop: 4 }}
                placeholder={t('product.downloadUrlPlaceholder', '输入网盘链接或直链')}
                prefix={<LinkOutlined />}
              />
            )}
          />
        </div>
      )}

      {(deliveryType === 'KEY' || deliveryType === 'HYBRID') && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('product.activationKeys', '激活码/卡密')}</Text>
          <TextArea
            rows={6}
            style={{ marginTop: 4 }}
            placeholder={t('product.activationKeysPlaceholder', '每行一个激活码，购买后自动发货')}
            value={activationKeys}
            onChange={(e) => setActivationKeys(e.target.value)}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            已输入 {activationKeys.split('\n').filter(k => k.trim()).length} 个激活码
          </Text>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.installGuide', '安装说明')}</Text>
        <Controller
          name="installGuide"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={3}
              style={{ marginTop: 4 }}
              placeholder={t('product.installGuidePlaceholder', '安装步骤和使用方法')}
            />
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.updateNote', '更新说明')}</Text>
        <Controller
          name="updateNote"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={2}
              style={{ marginTop: 4 }}
              placeholder={t('product.updateNotePlaceholder', '版本更新内容')}
            />
          )}
        />
      </div>
    </>
  );

  // 渲染数字资源专属字段
  const renderDigitalFields = () => (
    <>
      <Divider>{t('product.digitalFields', '数字资源信息')}</Divider>
      
      {renderDeliveryTypeSelector()}

      {(deliveryType === 'FILE' || deliveryType === 'HYBRID') && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('product.fileUpload', '文件上传')}</Text>
          <div style={{ marginTop: 8 }}>
            <Upload
              beforeUpload={() => {
                message.info(t('product.fileUploadHint', '文件上传功能需要配置存储服务'));
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>{t('product.selectFile', '选择文件')}</Button>
            </Upload>
          </div>
        </div>
      )}

      {(deliveryType === 'LINK' || deliveryType === 'HYBRID') && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>{t('product.downloadUrl', '下载链接')}</Text>
          <Controller
            name="downloadUrl"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                style={{ marginTop: 4 }}
                placeholder={t('product.downloadUrlPlaceholder', '输入网盘链接或直链')}
                prefix={<LinkOutlined />}
              />
            )}
          />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Text strong>{t('product.resourceDescription', '资源说明')}</Text>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextArea
              {...field}
              rows={4}
              style={{ marginTop: 4 }}
              placeholder={t('product.resourceDescriptionPlaceholder', '资源内容、使用方法、授权说明等')}
            />
          )}
        />
      </div>
    </>
  );

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder={t('common.search')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'ACTIVE', label: t('product.status.active') },
                { value: 'INACTIVE', label: t('product.status.inactive') },
                { value: 'PENDING', label: t('product.status.pending') },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              setUploadedImages([]);
              setUploadedFiles([]);
              setActivationKeys('');
              reset({
                productType: 'ACCOUNT',
                deliveryType: 'FILE',
                countryMode: 'NONE',
                platform: 'TikTok',
                title: '',
                categoryId: '',
                price: 0,
                stock: 0,
              });
              setDrawerOpen(true);
            }}
          >
            {t('product.add')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize,
            showSizeChanger: true,
            onChange: (_, size) => setPageSize(size),
          }}
        />
      </Card>

      <Drawer
        title={editingProduct ? t('product.edit') : t('product.add')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 商品图片上传 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.images', '商品图片')}</Text>
            <div style={{ marginTop: 8 }}>
              <Upload
                listType="picture-card"
                accept="image/*"
                maxCount={5}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    setUploadedImages((prev) => [...prev, base64]);
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
                onRemove={(file) => {
                  const idx = parseInt(file.uid.replace('-', ''), 10);
                  setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
                }}
                fileList={uploadedImages.map((url, index) => ({
                  uid: `-${index}`,
                  name: `image-${index}`,
                  status: 'done' as const,
                  url,
                }))}
              >
                {uploadedImages.length < 5 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>{t('product.uploadImage', '上传图片')}</div>
                  </div>
                )}
              </Upload>
            </div>
          </div>

          {/* 商品类型选择 */}
          {renderProductTypeSelector()}

          {/* 商品标题 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.title')}</Text>
            <Input {...register('title')} style={{ marginTop: 4 }} />
            {errors.title && <Text type="danger">{errors.title.message}</Text>}
          </div>

          {/* 分类选择 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.category')}</Text>
            <select {...register('categoryId')} className="ant-input" style={{ marginTop: 4, width: '100%' }}>
              <option value="">{t('common.select')}</option>
              {Array.isArray(categories) && categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <Text type="danger">{errors.categoryId.message}</Text>}
          </div>

          {/* 价格和库存 */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <Text strong>{t('product.price')}</Text>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0.01}
                    step={0.01}
                    precision={2}
                    style={{ marginTop: 4, width: '100%' }}
                    prefix="$"
                  />
                )}
              />
              {errors.price && <Text type="danger">{errors.price.message}</Text>}
            </div>
            <div style={{ flex: 1 }}>
              <Text strong>{t('product.stock')}</Text>
              <Controller
                name="stock"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0}
                    precision={0}
                    style={{ marginTop: 4, width: '100%' }}
                  />
                )}
              />
              {errors.stock && <Text type="danger">{errors.stock.message}</Text>}
            </div>
          </div>

          {/* 根据商品类型显示不同字段 */}
          {productType === 'ACCOUNT' && renderAccountFields()}
          {productType === 'SOFTWARE' && renderSoftwareFields()}
          {productType === 'DIGITAL' && renderDigitalFields()}

          {/* 提交按钮 */}
          <div style={{ marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setDrawerOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                {t('common.save')}
              </Button>
            </Space>
          </div>
        </form>
      </Drawer>

      <PromotionModal
        open={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false);
          setPromotionProduct(null);
        }}
        productTitle={promotionProduct?.title || ''}
        currentPrice={promotionProduct?.price || 0}
        onApply={async (data) => {
          if (!promotionProduct?.id) return;
          await setPromotion(promotionProduct.id, data);
          queryClient.invalidateQueries({ queryKey: ['seller-products'] });
        }}
      />
    </div>
  );
}
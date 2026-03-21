import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Input, Switch,
  Modal, Form, Select, InputNumber, Typography,
  message, Popconfirm, Tooltip, Badge, Tree
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, ApartmentOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  getCategories, createCategory, updateCategory,
  deleteCategory, toggleCategoryActive,
  type Category, type CreateCategoryPayload
} from '@/services/admin';
import { extractApiErrorMessage } from '@/utils/errorHandler';

const { Title, Text } = Typography;

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'category-' + Date.now();
}

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [form] = Form.useForm<CreateCategoryPayload>();

  // 获取所有分类（含非激活）
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => getCategories(true),
  });

  // 顶级分类（无 parentId）
  const rootCategories = categories.filter(c => !c.parentId);
  // 所有子分类
  const childCategories = categories.filter(c => !!c.parentId);

  // 创建
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      message.success(t('common.createSuccess', '创建成功'));
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (e: any) => {
      message.error(extractApiErrorMessage(e, t('common.error', '操作失败')));
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryPayload> }) =>
      updateCategory(id, data),
    onSuccess: () => {
      message.success(t('common.updateSuccess', '更新成功'));
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (e: any) => {
      message.error(extractApiErrorMessage(e, t('common.error', '操作失败')));
    },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      message.success(t('common.deleteSuccess', '删除成功'));
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (e: any) => {
      message.error(extractApiErrorMessage(e, t('common.error', '操作失败')));
    },
  });

  // 切换激活
  const toggleMutation = useMutation({
    mutationFn: toggleCategoryActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const openCreate = (parentId?: string) => {
    setEditing(null);
    form.resetFields();
    if (parentId) form.setFieldValue('parentId', parentId);
    setModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditing(record);
    form.setFieldsValue({
      parentId: record.parentId || undefined,
      name: record.name,
      slug: record.slug,
      icon: record.icon || '',
      color: record.color || '',
      description: record.description || '',
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: t('admin.category.name', '分类名称'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => (
        <Space>
          {record.icon && <span style={{ fontSize: 18 }}>{record.icon}</span>}
          <Text strong={!record.parentId}>{name}</Text>
          {!record.parentId && (
            <Tag color="blue" style={{ fontSize: 11 }}>主分类</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <Text code style={{ fontSize: 12 }}>{slug}</Text>
      ),
    },
    {
      title: t('admin.category.parent', '所属主分类'),
      key: 'parent',
      render: (_: unknown, record: Category) => {
        if (!record.parentId) return <Tag color="purple">顶级</Tag>;
        const parent = categories.find(c => c.id === record.parentId);
        return <Tag>{parent?.name || record.parentId}</Tag>;
      },
    },
    {
      title: t('admin.category.products', '商品数'),
      dataIndex: 'productCount',
      key: 'productCount',
      width: 80,
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: count > 0 ? '#52c41a' : '#d9d9d9' }} />
      ),
    },
    {
      title: t('admin.category.sort', '排序'),
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 70,
      sorter: (a, b) => b.sortOrder - a.sortOrder,
    },
    {
      title: t('admin.category.active', '启用'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean, record: Category) => (
        <Switch
          checked={active}
          size="small"
          onChange={() => toggleMutation.mutate(record.id)}
          loading={toggleMutation.isPending}
        />
      ),
    },
    {
      title: t('common.actions', '操作'),
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Category) => (
        <Space size={4}>
          {!record.parentId && (
            <Tooltip title="添加子分类">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => openCreate(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title={t('common.edit', '编辑')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除该分类？"
            description={
              record.productCount > 0
                ? `该分类下有 ${record.productCount} 个商品，无法删除`
                : (record.children?.length ?? childCategories.filter(c => c.parentId === record.id).length) > 0
                  ? '该分类下有子分类，无法删除'
                  : '删除后不可恢复'
            }
            okText={t('common.confirm', '确认')}
            cancelText={t('common.cancel', '取消')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            disabled={record.productCount > 0 || childCategories.filter(c => c.parentId === record.id).length > 0}
          >
            <Tooltip title={t('common.delete', '删除')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.productCount > 0 || childCategories.filter(c => c.parentId === record.id).length > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 树形视图数据
  const treeData = rootCategories.map(root => ({
    key: root.id,
    title: (
      <Space>
        {root.icon && <span>{root.icon}</span>}
        <Text strong>{root.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>({root.productCount} 商品)</Text>
        <Tag color={root.isActive ? 'green' : 'default'} style={{ fontSize: 11 }}>
          {root.isActive ? '启用' : '停用'}
        </Tag>
      </Space>
    ),
    children: childCategories
      .filter(c => c.parentId === root.id)
      .map(child => ({
        key: child.id,
        title: (
          <Space>
            {child.icon && <span>{child.icon}</span>}
            <Text>{child.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>({child.productCount} 商品)</Text>
            <Tag color={child.isActive ? 'green' : 'default'} style={{ fontSize: 11 }}>
              {child.isActive ? '启用' : '停用'}
            </Tag>
          </Space>
        ),
      })),
  }));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          <AppstoreOutlined style={{ marginRight: 10 }} />
          分类管理
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          />
          <Button
            icon={<ApartmentOutlined />}
            onClick={() => setViewMode(viewMode === 'table' ? 'tree' : 'table')}
          >
            {viewMode === 'table' ? '树形视图' : '表格视图'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            新增主分类
          </Button>
        </Space>
      </div>

      <Card
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
        }}
      >
        {viewMode === 'tree' ? (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              共 {rootCategories.length} 个主分类，{childCategories.length} 个子分类
            </div>
            <Tree
              treeData={treeData}
              defaultExpandAll
              showLine={{ showLeafIcon: false }}
              style={{ background: 'transparent' }}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={categories}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 30, showSizeChanger: false }}
            style={{ background: 'transparent' }}
            rowClassName={(record) => record.parentId ? 'category-child-row' : 'category-root-row'}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共 {rootCategories.length} 个主分类，{childCategories.length} 个子分类，合计 {categories.length} 个
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Card>

      {/* 新增 / 编辑弹窗 */}
      <Modal
        title={
          <Space>
            <AppstoreOutlined />
            {editing ? '编辑分类' : '新增分类'}
          </Space>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        okText={editing ? t('common.save', '保存') : t('common.create', '创建')}
        cancelText={t('common.cancel', '取消')}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ sortOrder: 0, isActive: true }}
        >
          <Form.Item
            label="所属主分类（不选则创建为主分类）"
            name="parentId"
          >
            <Select
              allowClear
              placeholder="不选 = 顶级主分类"
              options={rootCategories.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }, { max: 50 }]}
          >
            <Input
              placeholder="例：TikTok 新号"
              onChange={(e) => {
                if (!editing) {
                  form.setFieldValue('slug', slugify(e.target.value) || '');
                }
              }}
            />
          </Form.Item>

          <Form.Item
            label="Slug（URL标识，英文小写）"
            name="slug"
            rules={[
              { required: true, message: '请输入 Slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
              { max: 50 },
            ]}
          >
            <Input placeholder="例：tiktok-new" />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item label="图标（Emoji）" name="icon" style={{ flex: 1 }}>
              <Input placeholder="例：🎵" maxLength={4} />
            </Form.Item>
            <Form.Item label="标签颜色" name="color" style={{ flex: 1 }}>
              <Input placeholder="例：#1677ff" />
            </Form.Item>
            <Form.Item label="排序权重" name="sortOrder" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} max={9999} />
            </Form.Item>
          </Space>

          <Form.Item label="分类描述" name="description">
            <Input.TextArea rows={2} placeholder="选填" maxLength={200} showCount />
          </Form.Item>

          <Form.Item label="是否启用" name="isActive" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}



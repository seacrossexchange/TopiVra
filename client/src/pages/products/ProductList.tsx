import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Pagination, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { productsService } from '@/services/products';
import type { Product, ProductFilters } from '@/services/products';
import SkeletonCard from '@/components/common/SkeletonCard';
import { useSeo } from '@/hooks/useSeo';
import PlatformIcon from './PlatformIcon';
import './ProductList.css';

const { Option } = Select;

interface PlatformNode {
  key: string;
  label: string;
  subs: { key: string; label: string }[];
}

export default function ProductList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const PLATFORM_TREE: PlatformNode[] = [
    { key: 'TikTok', label: 'TikTok', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'fansAccount', label: t('products.tree.fansAccount', '粉丝号') },
      { key: 'adAccount', label: t('products.tree.adAccount', '广告账号') },
      { key: 'shopAccount', label: t('products.tree.shopAccount', '橱窗号(TiktokShop)') },
    ]},
    { key: 'Instagram', label: 'Instagram', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'oldPostAccount', label: t('products.tree.oldPostAccount', '老贴号') },
      { key: 'fansAccount', label: t('products.tree.fansAccount', '粉丝号') },
      { key: 'threads', label: t('products.tree.threads', 'Threads') },
    ]},
    { key: 'Facebook', label: 'Facebook', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'adAccount', label: t('products.tree.adAccount', '广告账号') },
      { key: 'bmAccount', label: t('products.tree.bmAccount', 'BM商务管理') },
      { key: 'fanPage', label: t('products.tree.fanPage', '粉丝专页') },
      { key: 'friendAccount', label: t('products.tree.friendAccount', '友缘号') },
      { key: 'twoVerify', label: t('products.tree.twoVerify', '二解号') },
      { key: 'threeVerify', label: t('products.tree.threeVerify', '三解号') },
      { key: 'blackAccount', label: t('products.tree.blackAccount', '黑号') },
    ]},
    { key: 'Twitter / X', label: 'Twitter / X', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'fansAccount', label: t('products.tree.fansAccount', '粉丝号') },
    ]},
    { key: 'Discord', label: 'Discord', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'nitro', label: t('products.tree.nitro', '有Nitro') },
    ]},
    { key: 'Telegram', label: 'Telegram', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'premium', label: t('products.tree.premium', 'Premium会员') },
    ]},
    { key: 'Google', label: 'Google', subs: [
      { key: 'gmail', label: 'Gmail' },
      { key: 'voice', label: 'Google Voice' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'ads', label: 'Google Ads' },
      { key: 'gmailEdu', label: t('products.tree.gmailEdu', 'Gmail教育/企业') },
    ]},
    { key: 'WhatsApp', label: 'WhatsApp', subs: [
      { key: 'newAccount', label: t('products.tree.newAccount', '新号') },
      { key: 'oldAccount', label: t('products.tree.oldAccount', '老号') },
      { key: 'bizAccount', label: t('products.tree.bizAccount', '商业号') },
    ]},
    { key: 'email', label: t('products.tree.email', '邮箱'), subs: [
      { key: 'hotmail', label: 'Hotmail / Outlook' },
      { key: 'yahoo', label: 'Yahoo Mail' },
      { key: 'rambler', label: 'Rambler.ru' },
      { key: 'mailru', label: 'Mail.ru' },
      { key: 'proton', label: 'ProtonMail' },
    ]},
    { key: 'aiTools', label: t('products.tree.aiTools', 'AI & 工具'), subs: [
      { key: 'chatgpt', label: 'ChatGPT' },
      { key: 'claude', label: 'Claude' },
      { key: 'midjourney', label: 'Midjourney' },
      { key: 'proxyIP', label: t('products.tree.proxyIP', '代理IP') },
      { key: 'vpn', label: 'VPN' },
    ]},
    { key: 'otherPlatforms', label: t('products.tree.otherPlatforms', '其他平台'), subs: [
      { key: 'apple', label: 'Apple ID' },
      { key: 'snapchat', label: 'Snapchat' },
      { key: 'amazon', label: 'Amazon' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'reddit', label: 'Reddit' },
      { key: 'pinterest', label: 'Pinterest' },
      { key: 'github', label: 'GitHub' },
    ]},
  ];


  useSeo({
    title: t('products.seoTitle', '购买社交账号 - TikTok、Instagram、Facebook 账号交易'),
    description: t('products.seoDesc', 'TopiVra 提供各类社交平台账号交易服务。安全担保、自动发货、24小时客服。'),
    keywords: ['社交账号购买', 'TikTok账号', 'Instagram账号', 'Facebook账号'],
  });

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 300);
  };
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('latest');
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});
  const pageSize = 20;

  const buildFilters = (): ProductFilters => {
    const filters: ProductFilters = { page: currentPage, limit: pageSize };
    if (debouncedSearch) filters.search = debouncedSearch;
    if (selectedPlatform !== 'all') filters.platform = selectedPlatform;
    if (selectedCountry !== 'ALL') filters.categoryId = selectedCountry;
    const sortMapping: Record<string, { sortBy: 'price' | 'soldCount' | 'createdAt' | 'viewCount'; sortOrder: 'asc' | 'desc' }> = {
      latest: { sortBy: 'createdAt', sortOrder: 'desc' },
      'price-asc': { sortBy: 'price', sortOrder: 'asc' },
      'price-desc': { sortBy: 'price', sortOrder: 'desc' },
      popular: { sortBy: 'soldCount', sortOrder: 'desc' },
    };
    if (sortMapping[sortBy]) {
      filters.sortBy = sortMapping[sortBy].sortBy;
      filters.sortOrder = sortMapping[sortBy].sortOrder;
    }
    return filters;
  };

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentPage, debouncedSearch, selectedPlatform, selectedCountry, sortBy],
    queryFn: async () => {
      const response = await productsService.getProducts(buildFilters());
      return response.data;
    },
  });

  const products: Product[] = productsData?.items || [];
  const totalItems: number = productsData?.total || 0;

  const toggleNode = (key: string) => {
    setOpenNodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectPlatform = (key: string) => {
    setSelectedPlatform(key);
    setSelectedSub('');
    setCurrentPage(1);
  };

  const selectAll = () => {
    setSelectedPlatform('all');
    setSelectedSub('');
    setCurrentPage(1);
  };

  const selectSub = (platformKey: string, sub: string) => {
    setSelectedPlatform(platformKey);
    setSelectedSub(sub);
    setCurrentPage(1);
  };

  const getBadgeLabel = (product: Product) => {
    const name = product.category?.name || product.categoryId || '';
    if (name.length > 8) return name.slice(0, 8);
    return name;
  };

  const getPageTitle = () => {
    if (selectedPlatform === 'all') return t('products.allProducts', '全部商品');
    if (selectedSub) return `${selectedPlatform} · ${selectedSub}`;
    return selectedPlatform;
  };

  const countryList = [
    { code: 'ALL', label: t('products.all', '全部') },
    { code: 'US', label: t('products.countries.US', '美国') },
    { code: 'VN', label: t('products.countries.VN', '越南') },
    { code: 'GB', label: t('products.countries.GB', '英国') },
    { code: 'JP', label: t('products.countries.JP', '日本') },
    { code: 'IN', label: t('products.countries.IN', '印度') },
  ];

  return (
    <div className="pl-wrap">
      {/* 左侧分类树 */}
      <aside className="pl-sidebar">
        <div className="pl-tree-header">{t('products.tree.allCategories', '全部分类')}</div>
        <ul className="pl-tree-root">
          {/* 全部商品 */}
          <li className="pl-tree-item">
            <span
              className={`pl-tree-link pl-tree-link-all${selectedPlatform === 'all' ? ' active' : ''}`}
              onClick={selectAll}
            >
              <span className="pl-tree-icon">
                <PlatformIcon name="全部" size={16} />
              </span>
              <span className="pl-tree-label">{t('products.allProducts', '全部商品')}</span>
            </span>
          </li>

          {PLATFORM_TREE.map((node) => {
            const isOpen = !!openNodes[node.key];
            const isActive = selectedPlatform === node.key;
            return (
              <li key={node.key} className="pl-tree-item">
                <div className="pl-tree-branch">
                  <button
                    type="button"
                    className={`pl-tree-toggle${isOpen ? ' open' : ''}`}
                    onClick={() => toggleNode(node.key)}
                    aria-expanded={isOpen ? 'true' : 'false'}
                  >
                    <span className="pl-tree-arrow">▶</span>
                  </button>
                  <span
                    className={`pl-tree-link${isActive && !selectedSub ? ' active' : ''}`}
                    onClick={() => selectPlatform(node.key)}
                  >
                    <span className="pl-tree-icon">
                      <PlatformIcon name={node.key} size={15} />
                    </span>
                    <span className="pl-tree-label">{node.label}</span>
                  </span>
                </div>
                <ul className={`pl-tree-children${isOpen ? ' open' : ''}`}>
                  {node.subs.map((sub) => (
                    <li key={sub.key} className="pl-tree-child">
                      <span
                        className={`pl-tree-sub${isActive && selectedSub === sub.label ? ' active' : ''}`}
                        onClick={() => selectSub(node.key, sub.label)}
                      >
                        <span className="pl-tree-line" />
                        <span className="pl-tree-label">{sub.label}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 右侧内容 */}
      <div className="pl-content">

        <h2 className="pl-section-title">{getPageTitle()}</h2>

        {/* 国家药丸 */}
        <div className="pl-country-bar">
          {countryList.map((c) => (
            <span
              key={c.code}
              className={`pl-country-pill${selectedCountry === c.code ? ' active' : ''}`}
              onClick={() => { setSelectedCountry(c.code); setCurrentPage(1); }}
            >
              {c.label}
            </span>
          ))}
        </div>

        {/* 工具栏 */}
        <div className="pl-toolbar">
          <div className="pl-toolbar-left">
            <Input
              className="pl-search"
              placeholder={t('products.searchPlaceholder', '搜索商品...')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              onClear={() => handleSearchChange('')}
              allowClear
            />
            <span className="pl-result-count">{t('products.found', {count: totalItems})}</span>
          </div>
          <Select value={sortBy} onChange={setSortBy} style={{ width: 130 }} size="small">
            <Option value="latest">{t('products.latest', '最新上架')}</Option>
            <Option value="price-asc">{t('products.priceAsc', '价格从低到高')}</Option>
            <Option value="price-desc">{t('products.priceDesc', '价格从高到低')}</Option>
            <Option value="popular">{t('products.popular', '销量最高')}</Option>
          </Select>
        </div>

        {/* 商品网格 */}
        {isLoading ? (
          <div className="pl-skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="pl-empty">
            <Empty description={t('products.noProducts', '暂无该分类商品')} />
          </div>
        ) : (
          <>
            <div className="pl-grid">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="pl-card"
                  onClick={() => navigate(`/products/${product.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/products/${product.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="article"
                  aria-label={`${product.title}，价格 ¥${product.price}`}
                >
                  <div className="pl-card-img-wrap">
                    <span className="pl-card-badge">{getBadgeLabel(product)}</span>
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        loading="lazy"
                        className="pl-card-img"
                      />
                    ) : (
                      <span className="pl-card-platform-icon">
                        <PlatformIcon name={product.category?.name || ''} size={48} />
                      </span>
                    )}
                  </div>
                  <div className="pl-card-body">
                    <div className="pl-card-tags">
                      <span className="pl-card-tag pl-card-tag-country">
                        {product.category?.name || product.categoryId}
                      </span>
                    </div>
                    <h3 className="pl-card-title">{product.title}</h3>
                    <p className="pl-card-desc">{product.description || t('products.defaultDesc', '高质量账号，安全稳定')}</p>
                    <div className="pl-card-meta">
                      <span className="pl-card-price">¥{product.price}</span>
                      <span className="pl-card-stock">{t('products.stock', '库存')}: {product.stock} {t('common.pieces', '件')}</span>
                    </div>
                    <Button type="primary" className="pl-card-btn" size="small">
                      {t('products.buyNow', '立即购买')}
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="pl-pagination">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={totalItems}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

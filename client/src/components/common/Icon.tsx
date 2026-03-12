/**
 * Icon 组件 - 统一图标封装
 * 基于 @ant-design/icons
 * 图标使用规范：导航用 outlined，操作用 filled
 */

import React from 'react';
import {
  // 导航图标 (outlined)
  HomeOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  MenuOutlined,
  AppstoreOutlined,
  BarsOutlined,
  
  // 操作图标 (filled)
  HeartFilled,
  StarFilled,
  EditFilled,
  DeleteFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
  
  // 操作图标 (outlined)
  HeartOutlined,
  StarOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  MinusOutlined,
  MoreOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  UploadOutlined,
  CopyOutlined,
  ReloadOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  
  // 箭头图标
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  DownOutlined,
  
  // 状态图标
  LoadingOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  
  // 社交/媒体图标
  MessageOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  
  // 文件/内容图标
  FileOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FolderOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  
  // 货币/交易图标
  PayCircleOutlined,
  WalletOutlined,
  CreditCardOutlined,
  DollarOutlined,
  
  // 其他常用图标
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TagOutlined,
  TrophyOutlined,
  CrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  KeyOutlined,
  IdcardOutlined,
  TeamOutlined,
  
} from '@ant-design/icons';

// 图标大小预设
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

// 图标颜色预设
export type IconColor = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'inherit';

// 图标名称映射
export type IconName = 
  // 导航
  | 'home' | 'shop' | 'cart' | 'user' | 'setting' | 'search' | 'bell' 
  | 'menu' | 'apps' | 'bars'
  // 操作 - outlined
  | 'heart' | 'heart-o' | 'star' | 'star-o' | 'edit' | 'edit-o' 
  | 'delete' | 'delete-o' | 'check' | 'check-o' | 'close' | 'close-o' 
  | 'info' | 'info-o' | 'plus' | 'minus' | 'more' | 'share' 
  | 'download' | 'upload' | 'copy' | 'reload' | 'filter' | 'sort'
  | 'eye' | 'eye-off' | 'lock' | 'unlock'
  // 箭头
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right'
  | 'up' | 'down' | 'left' | 'right'
  // 状态
  | 'loading' | 'warning' | 'question' | 'exclamation'
  // 社交
  | 'message' | 'mail' | 'phone' | 'global'
  // 文件
  | 'file' | 'file-image' | 'file-text' | 'folder' | 'picture' | 'video'
  // 交易
  | 'pay' | 'wallet' | 'credit-card' | 'dollar'
  // 其他
  | 'calendar' | 'clock' | 'location' | 'tag' | 'trophy' | 'crown' 
  | 'fire' | 'thunderbolt' | 'safety' | 'security' | 'key' | 'idcard' | 'team';

// 基础图标属性
interface BaseIconProps {
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
  rotate?: number;
  twoToneColor?: string;
}

// 组件 Props
export interface IconProps extends BaseIconProps {
  /** 图标名称 */
  name: IconName;
  /** 图标大小：预设或自定义数值 */
  size?: IconSize;
  /** 图标颜色预设 */
  color?: IconColor;
  /** 是否旋转（用于 loading） */
  spin?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** aria-label 无障碍标签 */
  'aria-label'?: string;
}

// 大小映射
const sizeMap: Record<string, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

// 颜色映射到 CSS 变量
const colorMap: Record<string, string> = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  tertiary: 'var(--color-text-tertiary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  inherit: 'currentColor',
};

// 图标组件映射
const iconMap: Record<IconName, React.ComponentType<BaseIconProps>> = {
  // 导航
  home: HomeOutlined,
  shop: ShopOutlined,
  cart: ShoppingCartOutlined,
  user: UserOutlined,
  setting: SettingOutlined,
  search: SearchOutlined,
  bell: BellOutlined,
  menu: MenuOutlined,
  apps: AppstoreOutlined,
  bars: BarsOutlined,
  
  // 操作 - filled
  heart: HeartFilled,
  'heart-o': HeartOutlined,
  star: StarFilled,
  'star-o': StarOutlined,
  edit: EditFilled,
  'edit-o': EditOutlined,
  delete: DeleteFilled,
  'delete-o': DeleteOutlined,
  check: CheckCircleFilled,
  'check-o': CheckCircleOutlined,
  close: CloseCircleFilled,
  'close-o': CloseCircleOutlined,
  info: InfoCircleFilled,
  'info-o': InfoCircleOutlined,
  plus: PlusOutlined,
  minus: MinusOutlined,
  more: MoreOutlined,
  share: ShareAltOutlined,
  download: DownloadOutlined,
  upload: UploadOutlined,
  copy: CopyOutlined,
  reload: ReloadOutlined,
  filter: FilterOutlined,
  sort: SortAscendingOutlined,
  eye: EyeOutlined,
  'eye-off': EyeInvisibleOutlined,
  lock: LockOutlined,
  unlock: UnlockOutlined,
  
  // 箭头
  'arrow-up': ArrowUpOutlined,
  'arrow-down': ArrowDownOutlined,
  'arrow-left': ArrowLeftOutlined,
  'arrow-right': ArrowRightOutlined,
  up: UpOutlined,
  down: DownOutlined,
  left: LeftOutlined,
  right: RightOutlined,
  
  // 状态
  loading: LoadingOutlined,
  warning: WarningOutlined,
  question: QuestionCircleOutlined,
  exclamation: ExclamationCircleOutlined,
  
  // 社交
  message: MessageOutlined,
  mail: MailOutlined,
  phone: PhoneOutlined,
  global: GlobalOutlined,
  
  // 文件
  file: FileOutlined,
  'file-image': FileImageOutlined,
  'file-text': FileTextOutlined,
  folder: FolderOutlined,
  picture: PictureOutlined,
  video: VideoCameraOutlined,
  
  // 交易
  pay: PayCircleOutlined,
  wallet: WalletOutlined,
  'credit-card': CreditCardOutlined,
  dollar: DollarOutlined,
  
  // 其他
  calendar: CalendarOutlined,
  clock: ClockCircleOutlined,
  location: EnvironmentOutlined,
  tag: TagOutlined,
  trophy: TrophyOutlined,
  crown: CrownOutlined,
  fire: FireOutlined,
  thunderbolt: ThunderboltOutlined,
  safety: SafetyOutlined,
  security: SecurityScanOutlined,
  key: KeyOutlined,
  idcard: IdcardOutlined,
  team: TeamOutlined,
};

/**
 * Icon 组件
 * 统一管理图标样式和大小
 * 
 * @example
 * // 基础使用
 * <Icon name="home" />
 * 
 * // 自定义大小
 * <Icon name="heart" size="lg" />
 * <Icon name="heart" size={32} />
 * 
 * // 颜色预设
 * <Icon name="check" color="success" />
 * 
 * // 加载动画
 * <Icon name="loading" spin />
 * 
 * // 可点击
 * <Icon name="edit" onClick={handleEdit} />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'inherit',
  spin,
  onClick,
  className,
  style,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    // Invalid icon name - return null silently
    return null;
  }
  
  // 计算实际大小
  const iconSize = typeof size === 'number' ? size : sizeMap[size] || 16;
  
  // 计算颜色
  const iconColor = colorMap[color] || 'currentColor';
  
  // 合并样式
  const mergedStyle: React.CSSProperties = {
    color: iconColor,
    fontSize: iconSize,
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };
  
  // 确保 loading 图标默认旋转
  const shouldSpin = spin ?? name === 'loading';
  
  const iconElement = (
    <IconComponent
      {...rest}
      style={mergedStyle}
      spin={shouldSpin}
      className={className}
    />
  );

  // 如果有 onClick，包装在可点击的 span 中
  if (onClick) {
    return (
      <span
        onClick={onClick}
        role="button"
        aria-label={ariaLabel || name}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          minWidth: 44,
          minHeight: 44,
        }}
      >
        {iconElement}
      </span>
    );
  }

  return iconElement;
};

// 默认导出
export default Icon;

// 导出所有图标组件供直接使用
export {
  // 导航图标
  HomeOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  MenuOutlined,
  AppstoreOutlined,
  BarsOutlined,
  
  // 操作图标
  HeartOutlined,
  HeartFilled,
  StarOutlined,
  StarFilled,
  EditOutlined,
  EditFilled,
  DeleteOutlined,
  DeleteFilled,
  CheckCircleOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  CloseCircleFilled,
  InfoCircleOutlined,
  InfoCircleFilled,
  PlusOutlined,
  MinusOutlined,
  MoreOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  UploadOutlined,
  CopyOutlined,
  ReloadOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  
  // 箭头图标
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  DownOutlined,
  
  // 状态图标
  LoadingOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  
  // 社交图标
  MessageOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  
  // 文件图标
  FileOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FolderOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  
  // 货币图标
  PayCircleOutlined,
  WalletOutlined,
  CreditCardOutlined,
  DollarOutlined,
  
  // 其他图标
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TagOutlined,
  TrophyOutlined,
  CrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  KeyOutlined,
  IdcardOutlined,
  TeamOutlined,
};
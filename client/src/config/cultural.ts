/**
 * 文化适配配置
 * 针对不同地区的文化差异进行适配
 */

export interface CulturalConfig {
  // 颜色含义
  colors: {
    success: string;
    warning: string;
    danger: string;
    info: string;
    primary: string;
  };
  // 日期格式偏好
  dateFormat: {
    short: string;
    medium: string;
    long: string;
    time: string;
  };
  // 数字格式
  numberFormat: {
    decimalSeparator: string;
    thousandsSeparator: string;
  };
  // 货币显示
  currencyDisplay: 'symbol' | 'code' | 'name';
  // 名称格式
  nameFormat: 'first-last' | 'last-first';
  // 地址格式
  addressFormat: string[];
  // 电话格式
  phoneFormat: string;
  // 工作日
  workDays: number[]; // 0=周日, 1=周一, ...
  // 周开始日
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  // 时间制式
  timeFormat: '12h' | '24h';
  // 敏感内容
  culturalNotes: string[];
}

export const culturalConfigs: Record<string, CulturalConfig> = {
  'zh-CN': {
    colors: {
      success: '#52c41a', // 绿色 - 生机、安全
      warning: '#faad14', // 黄色 - 警告、皇家
      danger: '#ff4d4f', // 红色 - 喜庆但也表示危险
      info: '#1890ff', // 蓝色 - 科技、信任
      primary: '#1890ff',
    },
    dateFormat: {
      short: 'YYYY/MM/DD',
      medium: 'YYYY年MM月DD日',
      long: 'YYYY年MM月DD日 dddd',
      time: 'HH:mm:ss',
    },
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
    },
    currencyDisplay: 'symbol',
    nameFormat: 'last-first', // 姓在前
    addressFormat: ['country', 'province', 'city', 'district', 'street', 'building'],
    phoneFormat: '+86 XXX XXXX XXXX',
    workDays: [1, 2, 3, 4, 5], // 周一到周五
    weekStartsOn: 1, // 周一
    timeFormat: '24h',
    culturalNotes: [
      '避免使用数字4（谐音"死"）',
      '红色代表喜庆和好运',
      '白色与葬礼相关，避免在喜庆场合使用',
      '礼物避免钟表、伞、鞋',
    ],
  },
  'en': {
    colors: {
      success: '#10b981', // 绿色 - 成功、前进
      warning: '#f59e0b', // 橙色 - 警告
      danger: '#ef4444', // 红色 - 危险、停止
      info: '#3b82f6', // 蓝色 - 信息
      primary: '#3b82f6',
    },
    dateFormat: {
      short: 'MM/DD/YYYY',
      medium: 'MMM DD, YYYY',
      long: 'MMMM DD, YYYY',
      time: 'hh:mm A',
    },
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
    },
    currencyDisplay: 'symbol',
    nameFormat: 'first-last',
    addressFormat: ['street', 'city', 'state', 'zipCode', 'country'],
    phoneFormat: '+1 (XXX) XXX-XXXX',
    workDays: [1, 2, 3, 4, 5],
    weekStartsOn: 0, // 周日
    timeFormat: '12h',
    culturalNotes: [
      'Green means go, red means stop',
      'Thumbs up is positive',
      'Direct communication is valued',
    ],
  },
  'id': {
    colors: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      primary: '#3b82f6',
    },
    dateFormat: {
      short: 'DD/MM/YYYY',
      medium: 'DD MMM YYYY',
      long: 'DD MMMM YYYY',
      time: 'HH:mm',
    },
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
    },
    currencyDisplay: 'symbol',
    nameFormat: 'first-last',
    addressFormat: ['street', 'district', 'city', 'province', 'zipCode', 'country'],
    phoneFormat: '+62 XXX-XXXX-XXXX',
    workDays: [1, 2, 3, 4, 5],
    weekStartsOn: 1,
    timeFormat: '24h',
    culturalNotes: [
      '尊重伊斯兰文化',
      '避免左手递物',
      '绿色是伊斯兰教的神圣颜色',
      '避免展示过多皮肤的图片',
    ],
  },
  'pt-BR': {
    colors: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      primary: '#10b981', // 巴西国旗绿色
    },
    dateFormat: {
      short: 'DD/MM/YYYY',
      medium: 'DD de MMM de YYYY',
      long: 'DD de MMMM de YYYY',
      time: 'HH:mm',
    },
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: '.',
    },
    currencyDisplay: 'symbol',
    nameFormat: 'first-last',
    addressFormat: ['street', 'number', 'district', 'city', 'state', 'cep', 'country'],
    phoneFormat: '+55 (XX) XXXXX-XXXX',
    workDays: [1, 2, 3, 4, 5],
    weekStartsOn: 0,
    timeFormat: '24h',
    culturalNotes: [
      '热情友好的沟通风格',
      '紫色与哀悼相关',
      '足球文化重要',
    ],
  },
  'es-MX': {
    colors: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      primary: '#dc2626', // 墨西哥国旗红色
    },
    dateFormat: {
      short: 'DD/MM/YYYY',
      medium: 'DD de MMM de YYYY',
      long: 'DD de MMMM de YYYY',
      time: 'HH:mm',
    },
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
    },
    currencyDisplay: 'symbol',
    nameFormat: 'first-last',
    addressFormat: ['street', 'number', 'colony', 'city', 'state', 'zipCode', 'country'],
    phoneFormat: '+52 XX XXXX XXXX',
    workDays: [1, 2, 3, 4, 5],
    weekStartsOn: 0,
    timeFormat: '12h',
    culturalNotes: [
      '家庭观念强',
      '尊重传统节日（亡灵节等）',
      '紫色与宗教相关',
    ],
  },
};

/**
 * 获取文化配置
 */
export function getCulturalConfig(language: string): CulturalConfig {
  return culturalConfigs[language] || culturalConfigs['en'];
}

/**
 * 获取文化适配的颜色
 */
export function getCulturalColor(language: string, type: keyof CulturalConfig['colors']): string {
  const config = getCulturalConfig(language);
  return config.colors[type];
}

/**
 * 获取文化适配的日期格式
 */
export function getCulturalDateFormat(language: string, type: keyof CulturalConfig['dateFormat']): string {
  const config = getCulturalConfig(language);
  return config.dateFormat[type];
}

/**
 * 检查是否为工作日
 */
export function isWorkDay(language: string, dayOfWeek: number): boolean {
  const config = getCulturalConfig(language);
  return config.workDays.includes(dayOfWeek);
}









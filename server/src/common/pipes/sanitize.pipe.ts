import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xssFilter = require('xss');

/**
 * XSS 净化选项
 * 保留一些安全的 HTML 标签，但过滤危险属性
 */
const xssOptions = {
  whiteList: {
    // 允许的安全标签
    a: ['href', 'title', 'target', 'rel'],
    b: [],
    i: [],
    u: [],
    s: [],
    strong: [],
    em: [],
    br: [],
    p: [],
    span: [],
    div: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    ul: [],
    ol: [],
    li: [],
    blockquote: [],
    code: [],
    pre: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  stripIgnoreTag: true, // 过滤所有非白名单标签
  stripIgnoreTagBody: ['script', 'style', 'iframe'], // 完全移除危险标签及其内容
  allowCommentTag: false, // 禁止注释标签
  css: {
    // 允许的 CSS 属性（用于 style 属性）
    whiteList: {
      color: true,
      'background-color': true,
      'font-size': true,
      'font-weight': true,
      'text-align': true,
      margin: true,
      padding: true,
    },
  },
};

/**
 * 递归净化对象中的所有字符串值
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // 净化字符串，移除 XSS 攻击向量
    return xssFilter(value, xssOptions);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(value)) {
      // 净化键名（防止原型污染）
      const sanitizedKey = xssFilter(key, { whiteList: {} });
      if (sanitizedKey !== key) {
        throw new BadRequestException('检测到非法字符');
      }
      sanitized[sanitizedKey] = sanitizeValue(value[key]);
    }
    return sanitized;
  }

  return value;
}

/**
 * 检查是否包含可疑的攻击模式
 */
function detectMaliciousPatterns(value: any): boolean {
  if (typeof value !== 'string') {
    if (Array.isArray(value)) {
      return value.some((item) => detectMaliciousPatterns(item));
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some((item) => detectMaliciousPatterns(item));
    }
    return false;
  }

  // 检测常见的攻击模式
  const maliciousPatterns = [
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /vbscript\s*:/gi,
    /on\w+\s*=/gi, // 事件处理器: onclick=, onerror=, etc.
    /<\s*script/gi,
    /<\s*iframe/gi,
    /<\s*embed/gi,
    /<\s*object/gi,
    /expression\s*\(/gi, // CSS expression
    /@import/gi, // CSS import
  ];

  return maliciousPatterns.some((pattern) => pattern.test(value));
}

/**
 * 全局 XSS 净化管道
 * 自动净化所有传入的请求数据
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // 只处理 body、query、param 类型
    if (!['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }

    // 跳过空值
    if (value === null || value === undefined) {
      return value;
    }

    // 检测恶意模式（静默处理，由净化器自动清理）
    // 生产环境不输出日志，避免日志污染
    if (detectMaliciousPatterns(value) && process.env.NODE_ENV === 'development') {
      // 仅开发环境记录，生产环境静默处理
    }

    // 执行净化
    const sanitized = sanitizeValue(value);

    return sanitized;
  }
}

/**
 * 严格模式净化管道
 * 检测到恶意模式时直接拒绝请求
 */
@Injectable()
export class StrictSanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // 只处理 body、query、param 类型
    if (!['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }

    // 跳过空值
    if (value === null || value === undefined) {
      return value;
    }

    // 检测恶意模式
    if (detectMaliciousPatterns(value)) {
      throw new BadRequestException('请求包含非法内容');
    }

    // 执行净化
    const sanitized = sanitizeValue(value);

    return sanitized;
  }
}

/**
 * 纯文本净化管道
 * 移除所有 HTML 标签，只保留纯文本
 */
@Injectable()
export class PlainTextPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (typeof value !== 'string') {
      return value;
    }

    // 移除所有 HTML 标签
    return xssFilter(value, {
      whiteList: {}, // 不允许任何标签
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }
}

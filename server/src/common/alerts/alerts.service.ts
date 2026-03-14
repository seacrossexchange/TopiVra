import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AlertOptions {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly telegramBotToken: string | undefined;
  private readonly telegramChatId: string | undefined;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.telegramBotToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.telegramChatId = this.configService.get('TELEGRAM_CHAT_ID');
    this.enabled = !!(this.telegramBotToken && this.telegramChatId);

    if (this.enabled) {
      this.logger.log('Telegram 告警服务已启用');
    } else {
      this.logger.warn('Telegram 告警服务未配置，告警将仅记录到日志');
    }
  }

  /**
   * 发送告警消息
   */
  async sendAlert(options: AlertOptions): Promise<boolean> {
    const { level, title, message, details } = options;

    // 记录到本地日志
    this.logAlert(level, title, message, details);

    // 发送到 Telegram
    if (this.enabled) {
      try {
        await this.sendTelegramMessage(level, title, message, details);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`发送 Telegram 告警失败: ${message}`);
        return false;
      }
    }

    return false;
  }

  /**
   * 发送错误告警
   */
  async sendError(
    title: string,
    error: Error,
    details?: Record<string, unknown>,
  ): Promise<boolean> {
    return this.sendAlert({
      level: 'error',
      title,
      message: error.message,
      details: {
        ...details,
        stack: error.stack,
        name: error.name,
      },
    });
  }

  /**
   * 发送关键告警
   */
  async sendCritical(
    title: string,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<boolean> {
    return this.sendAlert({
      level: 'critical',
      title,
      message,
      details,
    });
  }

  /**
   * 发送系统告警（数据库/Redis 连接失败等）
   */
  async sendSystemAlert(
    service: string,
    status: 'down' | 'degraded' | 'recovered',
    details?: Record<string, unknown>,
  ): Promise<boolean> {
    const level =
      status === 'down'
        ? 'critical'
        : status === 'degraded'
          ? 'warning'
          : 'info';
    const title = `服务状态: ${service}`;
    const message = `服务 ${service} 状态变更: ${status}`;

    return this.sendAlert({
      level,
      title,
      message,
      details: {
        service,
        status,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  }

  /**
   * 发送 HTTP 5xx 错误告警
   */
  async sendHttpError(
    method: string,
    path: string,
    statusCode: number,
    error: string,
    userId?: string,
  ): Promise<boolean> {
    // 只告警 5xx 错误
    if (statusCode < 500) {
      return false;
    }

    const title = `HTTP ${statusCode} 错误`;
    const message = `${method} ${path} - ${statusCode}`;

    return this.sendAlert({
      level: 'error',
      title,
      message,
      details: {
        method,
        path,
        statusCode,
        error,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private logAlert(
    level: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const logMessage = `[ALERT][${level.toUpperCase()}] ${title}: ${message}`;
    const logDetails = details ? JSON.stringify(details, null, 2) : '';

    switch (level) {
      case 'critical':
      case 'error':
        this.logger.error(`${logMessage}\n${logDetails}`);
        break;
      case 'warning':
        this.logger.warn(`${logMessage}\n${logDetails}`);
        break;
      default:
        this.logger.log(`${logMessage}\n${logDetails}`);
    }
  }

  private async sendTelegramMessage(
    level: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) {
      return;
    }

    const levelEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      critical: '🔴',
    };

    const emoji = levelEmoji[level] || '📢';

    let text = `${emoji} *${this.escapeMarkdown(title)}*\n\n`;
    text += `${this.escapeMarkdown(message)}\n`;

    if (details) {
      text += '\n📋 *详情:*\n';
      for (const [key, value] of Object.entries(details)) {
        const valueStr =
          typeof value === 'object' ? JSON.stringify(value) : String(value);
        text += `• ${key}: \`${this.escapeMarkdown(valueStr)}\`\n`;
      }
    }

    text += `\n⏰ _${new Date().toISOString()}_`;

    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;

    await axios.post(url, {
      chat_id: this.telegramChatId,
      text,
      parse_mode: 'MarkdownV2',
    });
  }

  private escapeMarkdown(text: string): string {
    // MarkdownV2 需要转义的字符
    const specialChars = /[_*[\]()~`>#+\-=|{}.!\\]/g;
    return text.replace(specialChars, '\\$&');
  }
}

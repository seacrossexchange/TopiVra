import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

export interface EmailTemplate {
  subject: string;
  greeting: string;
  body: string;
  cta?: string;
  footer: string;
}

export interface EmailOptions {
  to: string;
  template: string;
  lang: string;
  data?: Record<string, any>;
}

@Injectable()
export class EmailI18nService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * 获取国际化邮件模板
   */
  async getEmailTemplate(
    template: string,
    lang: string,
    data: Record<string, any> = {},
  ): Promise<EmailTemplate> {
    const subject = await this.i18n.t(`email.${template}.subject`, {
      lang,
      args: data,
    });
    const greeting = await this.i18n.t(`email.${template}.greeting`, {
      lang,
      args: data,
    });
    const body = await this.i18n.t(`email.${template}.body`, {
      lang,
      args: data,
    });
    const cta = await this.i18n.t(`email.${template}.cta`, {
      lang,
      args: data,
    });
    const footer = await this.i18n.t(`email.${template}.footer`, {
      lang,
      args: data,
    });

    return {
      subject,
      greeting,
      body,
      cta,
      footer,
    };
  }

  /**
   * 生成 HTML 邮件内容
   */
  generateEmailHtml(template: EmailTemplate, ctaUrl?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }
    .body {
      font-size: 15px;
      color: #666;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .footer {
      padding: 30px;
      background: #f9fafb;
      text-align: center;
      font-size: 13px;
      color: #999;
      border-top: 1px solid #e5e7eb;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">TopiVra</h1>
    </div>
    <div class="content">
      <div class="greeting">${template.greeting}</div>
      <div class="body">${template.body}</div>
      ${
        ctaUrl && template.cta
          ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" class="cta-button">${template.cta}</a>
        </div>
      `
          : ''
      }
    </div>
    <div class="footer">
      ${template.footer}
      <div class="divider"></div>
      <div>© ${new Date().getFullYear()} TopiVra. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 发送国际化邮件（示例方法，需要集成实际邮件服务）
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const template = await this.getEmailTemplate(
      options.template,
      options.lang,
      options.data,
    );

    // 生成邮件 HTML（供调用方使用）
    this.generateEmailHtml(template, options.data?.ctaUrl);

    // TODO: 集成实际邮件服务（如 Nodemailer, SendGrid, AWS SES）
    // 邮件发送逻辑应在调用方实现
    // 此方法仅负责生成邮件模板
  }
}

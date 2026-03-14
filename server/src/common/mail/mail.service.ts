import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP 配置不完整，邮件发送功能将禁用。请配置 SMTP_HOST, SMTP_USER, SMTP_PASS',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10) || 587,
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.isConfigured = true;
    this.logger.log('邮件服务已初始化');
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(
        `邮件服务未配置，无法发送验证码到 ${email}。开发模式：验证码为 ${code}`,
      );
      return false;
    }

    const platformName =
      this.configService.get('PLATFORM_NAME') || 'Topter C2C';

    try {
      await this.transporter.sendMail({
        from: `"${platformName}" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `[${platformName}] 邮箱验证码`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3370FF 0%, #0052CC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">${platformName}</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您好，</p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您正在进行邮箱验证，验证码如下：</p>
              <div style="background: #fff; border: 2px dashed #3370FF; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3370FF;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">验证码有效期为 5 分钟，请尽快使用。</p>
              <p style="font-size: 14px; color: #999; margin-top: 30px;">如果您没有请求此验证码，请忽略此邮件。</p>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
              此邮件由系统自动发送，请勿回复。
            </p>
          </div>
        `,
      });

      this.logger.log(`验证码邮件已发送至 ${email}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送验证码邮件失败: ${err.message}`, err.stack);
      return false;
    }
  }

  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(`邮件服务未配置，无法发送密码重置验证码到 ${email}`);
      return false;
    }

    const platformName =
      this.configService.get('PLATFORM_NAME') || 'Topter C2C';

    try {
      await this.transporter.sendMail({
        from: `"${platformName}" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `[${platformName}] 密码重置验证码`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FF7D00 0%, #FF5722 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">密码重置</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您好，</p>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您正在重置密码，验证码如下：</p>
              <div style="background: #fff; border: 2px dashed #FF7D00; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FF7D00;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">验证码有效期为 5 分钟，请尽快使用。</p>
              <p style="font-size: 14px; color: #999; margin-top: 30px;">如果您没有请求重置密码，请忽略此邮件并确保您的账户安全。</p>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
              此邮件由系统自动发送，请勿回复。
            </p>
          </div>
        `,
      });

      this.logger.log(`密码重置验证码邮件已发送至 ${email}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送密码重置邮件失败: ${err.message}`, err.stack);
      return false;
    }
  }

  async sendOrderNotification(
    email: string,
    subject: string,
    content: string,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(`邮件服务未配置，无法发送订单通知到 ${email}`);
      return false;
    }

    const platformName =
      this.configService.get('PLATFORM_NAME') || 'Topter C2C';

    try {
      await this.transporter.sendMail({
        from: `"${platformName}" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `[${platformName}] ${subject}`,
        html: content,
      });

      this.logger.log(`订单通知邮件已发送至 ${email}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送订单通知邮件失败: ${err.message}`, err.stack);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}

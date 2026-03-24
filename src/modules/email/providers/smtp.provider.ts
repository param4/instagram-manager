import { Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { EmailProviderInterface } from './email-provider.interface';
import {
  SendEmailParams,
  SendEmailResult,
  SendBulkEmailParams,
  SendBulkEmailResult,
} from '../types/email.type';

type Transporter = import('nodemailer').Transporter;

export class SmtpProvider implements EmailProviderInterface {
  private readonly logger = new Logger(SmtpProvider.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const transport = await this.ensureInitialized();

    const info = await transport.sendMail({
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      from: params.from ?? this.configService.emailFrom,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo,
    });

    this.logger.debug(`Email sent to ${String(params.to)}`);

    return {
      messageId: info.messageId ?? '',
      accepted: true,
    };
  }

  async sendBulk(params: SendBulkEmailParams): Promise<SendBulkEmailResult> {
    const results = await Promise.all(params.messages.map((msg) => this.send(msg)));
    return { results };
  }

  private async ensureInitialized(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    try {
      const nodemailer = await import('nodemailer');

      this.transporter = nodemailer.createTransport({
        host: this.configService.smtpHost,
        port: this.configService.smtpPort,
        secure: this.configService.smtpSecure,
        auth: {
          user: this.configService.smtpUser,
          pass: this.configService.smtpPass,
        },
      });

      this.logger.log('SMTP email provider initialized');
      return this.transporter;
    } catch {
      throw new Error('SMTP provider requires "nodemailer". Run: pnpm add nodemailer');
    }
  }
}

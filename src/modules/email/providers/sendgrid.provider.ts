import { Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { EmailProviderInterface } from './email-provider.interface';
import {
  SendEmailParams,
  SendEmailResult,
  SendBulkEmailParams,
  SendBulkEmailResult,
} from '../types/email.type';

type SendGridMail = typeof import('@sendgrid/mail');

export class SendGridProvider implements EmailProviderInterface {
  private readonly logger = new Logger(SendGridProvider.name);
  private sgMail: SendGridMail | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const sg = await this.ensureInitialized();

    const msg = {
      to: params.to,
      from: params.from ?? this.configService.emailFrom,
      subject: params.subject,
      text: params.text ?? '',
      html: params.html,
      replyTo: params.replyTo,
    };

    const [response] = await sg.send(msg);

    this.logger.debug(`Email sent to ${String(params.to)}`);

    return {
      messageId: response.headers['x-message-id'] ?? '',
      accepted: response.statusCode >= 200 && response.statusCode < 300,
    };
  }

  async sendBulk(params: SendBulkEmailParams): Promise<SendBulkEmailResult> {
    const results = await Promise.all(
      params.messages.map((msg) => this.send(msg)),
    );
    return { results };
  }

  private async ensureInitialized(): Promise<SendGridMail> {
    if (this.sgMail) return this.sgMail;

    try {
      const sg = await import('@sendgrid/mail');
      sg.default.setApiKey(this.configService.sendgridApiKey);
      this.sgMail = sg.default;
      this.logger.log('SendGrid email provider initialized');
      return this.sgMail;
    } catch {
      throw new Error(
        'SendGrid provider requires "@sendgrid/mail". Run: pnpm add @sendgrid/mail',
      );
    }
  }
}

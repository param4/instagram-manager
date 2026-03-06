import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { EmailProviderInterface } from './email-provider.interface';
import { EmailProvider } from '../types/email.type';

@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<EmailProviderInterface> {
    const provider = this.configService.emailProvider as EmailProvider;
    this.logger.log(`Initializing email provider: ${provider}`);

    switch (provider) {
      case EmailProvider.SENDGRID: {
        const { SendGridProvider } = await import('./sendgrid.provider');
        return new SendGridProvider(this.configService);
      }
      case EmailProvider.SES: {
        const { SesProvider } = await import('./ses.provider');
        return new SesProvider(this.configService);
      }
      case EmailProvider.SMTP: {
        const { SmtpProvider } = await import('./smtp.provider');
        return new SmtpProvider(this.configService);
      }
      default:
        throw new Error(`Unsupported email provider: ${String(provider)}`);
    }
  }
}

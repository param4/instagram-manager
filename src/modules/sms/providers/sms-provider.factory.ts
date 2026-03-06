import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { SmsProviderInterface } from './sms-provider.interface';
import { SmsProvider } from '../types/sms.type';

@Injectable()
export class SmsProviderFactory {
  private readonly logger = new Logger(SmsProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<SmsProviderInterface> {
    const provider = this.configService.smsProvider as SmsProvider;
    this.logger.log(`Initializing SMS provider: ${provider}`);

    switch (provider) {
      case SmsProvider.TWILIO: {
        const { TwilioProvider } = await import('./twilio.provider');
        return new TwilioProvider(this.configService);
      }
      case SmsProvider.SNS: {
        const { SnsProvider } = await import('./sns.provider');
        return new SnsProvider(this.configService);
      }
      default:
        throw new Error(`Unsupported SMS provider: ${String(provider)}`);
    }
  }
}

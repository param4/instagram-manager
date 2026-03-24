import { Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { SmsProviderInterface } from './sms-provider.interface';
import { SendSmsParams, SendSmsResult } from '../types/sms.type';

type TwilioClient = import('twilio').Twilio;

export class TwilioProvider implements SmsProviderInterface {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: TwilioClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const client = await this.ensureInitialized();

    const message = await client.messages.create({
      to: params.to,
      from: params.from ?? this.configService.smsFrom,
      body: params.body,
    });

    this.logger.debug(`SMS sent to ${params.to}`);

    return {
      messageId: message.sid,
      accepted: true,
    };
  }

  private async ensureInitialized(): Promise<TwilioClient> {
    if (this.client) return this.client;

    try {
      const twilio = await import('twilio');
      this.client = twilio.default(
        this.configService.twilioAccountSid,
        this.configService.twilioAuthToken,
      );

      this.logger.log('Twilio SMS provider initialized');
      return this.client;
    } catch {
      throw new Error('Twilio provider requires "twilio". Run: pnpm add twilio');
    }
  }
}

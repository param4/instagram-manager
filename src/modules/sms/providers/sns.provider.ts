import { Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { SmsProviderInterface } from './sms-provider.interface';
import { SendSmsParams, SendSmsResult } from '../types/sms.type';

type SNSClient = import('@aws-sdk/client-sns').SNSClient;

export class SnsProvider implements SmsProviderInterface {
  private readonly logger = new Logger(SnsProvider.name);
  private client: SNSClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const { client, PublishCommand } = await this.ensureInitialized();

    const result = await client.send(
      new PublishCommand({
        PhoneNumber: params.to,
        Message: params.body,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: params.from ?? this.configService.smsFrom,
          },
        },
      }),
    );

    this.logger.debug(`SMS sent to ${params.to}`);

    return {
      messageId: result.MessageId ?? '',
      accepted: true,
    };
  }

  private async ensureInitialized() {
    if (this.client) {
      const sns = await import('@aws-sdk/client-sns');
      return { client: this.client, PublishCommand: sns.PublishCommand };
    }

    try {
      const sns = await import('@aws-sdk/client-sns');

      this.client = new sns.SNSClient({
        region: this.configService.snsRegion,
        credentials: {
          accessKeyId: this.configService.snsAccessKeyId,
          secretAccessKey: this.configService.snsSecretAccessKey,
        },
      });

      this.logger.log('AWS SNS SMS provider initialized');

      return { client: this.client, PublishCommand: sns.PublishCommand };
    } catch {
      throw new Error(
        'SNS provider requires "@aws-sdk/client-sns". Run: pnpm add @aws-sdk/client-sns',
      );
    }
  }
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { EmailProviderInterface } from './email-provider.interface';
import {
  SendEmailParams,
  SendEmailResult,
  SendBulkEmailParams,
  SendBulkEmailResult,
} from '../types/email.type';

type SESClient = import('@aws-sdk/client-ses').SESClient;

export class SesProvider implements EmailProviderInterface {
  private readonly logger = new Logger(SesProvider.name);
  private client: SESClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const { client, SendEmailCommand } = await this.ensureInitialized();

    const to = Array.isArray(params.to) ? params.to : [params.to];
    const from = params.from ?? this.configService.emailFrom;

    const result = await client.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: to },
        ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
        Message: {
          Subject: { Data: params.subject },
          Body: {
            ...(params.text ? { Text: { Data: params.text } } : {}),
            ...(params.html ? { Html: { Data: params.html } } : {}),
          },
        },
      }),
    );

    this.logger.debug(`Email sent to ${String(params.to)}`);

    return {
      messageId: result.MessageId ?? '',
      accepted: true,
    };
  }

  async sendBulk(params: SendBulkEmailParams): Promise<SendBulkEmailResult> {
    const results = await Promise.all(
      params.messages.map((msg) => this.send(msg)),
    );
    return { results };
  }

  private async ensureInitialized() {
    if (this.client) {
      const ses = await import('@aws-sdk/client-ses');
      return { client: this.client, SendEmailCommand: ses.SendEmailCommand };
    }

    try {
      const ses = await import('@aws-sdk/client-ses');

      this.client = new ses.SESClient({
        region: this.configService.sesRegion,
        credentials: {
          accessKeyId: this.configService.sesAccessKeyId,
          secretAccessKey: this.configService.sesSecretAccessKey,
        },
      });

      this.logger.log('AWS SES email provider initialized');

      return { client: this.client, SendEmailCommand: ses.SendEmailCommand };
    } catch {
      throw new Error(
        'SES provider requires "@aws-sdk/client-ses". Run: pnpm add @aws-sdk/client-ses',
      );
    }
  }
}

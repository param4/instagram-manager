import { Inject, Injectable } from '@nestjs/common';
import {
  EmailProviderInterface,
  EMAIL_PROVIDER_TOKEN,
} from '../providers/email-provider.interface';
import {
  SendEmailParams,
  SendEmailResult,
  SendBulkEmailParams,
  SendBulkEmailResult,
} from '../types/email.type';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: EmailProviderInterface,
  ) {}

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    return this.emailProvider.send(params);
  }

  async sendBulk(params: SendBulkEmailParams): Promise<SendBulkEmailResult> {
    return this.emailProvider.sendBulk(params);
  }
}

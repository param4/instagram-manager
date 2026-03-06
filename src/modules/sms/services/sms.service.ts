import { Inject, Injectable } from '@nestjs/common';
import {
  SmsProviderInterface,
  SMS_PROVIDER_TOKEN,
} from '../providers/sms-provider.interface';
import { SendSmsParams, SendSmsResult } from '../types/sms.type';

@Injectable()
export class SmsService {
  constructor(
    @Inject(SMS_PROVIDER_TOKEN)
    private readonly smsProvider: SmsProviderInterface,
  ) {}

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    return this.smsProvider.send(params);
  }
}

import { SendSmsParams, SendSmsResult } from '../types/sms.type';

export interface SmsProviderInterface {
  send(params: SendSmsParams): Promise<SendSmsResult>;
}

export const SMS_PROVIDER_TOKEN = Symbol('SMS_PROVIDER_TOKEN');

import {
  SendEmailParams,
  SendEmailResult,
  SendBulkEmailParams,
  SendBulkEmailResult,
} from '../types/email.type';

export interface EmailProviderInterface {
  send(params: SendEmailParams): Promise<SendEmailResult>;
  sendBulk(params: SendBulkEmailParams): Promise<SendBulkEmailResult>;
}

export const EMAIL_PROVIDER_TOKEN = Symbol('EMAIL_PROVIDER_TOKEN');

export enum SmsProvider {
  TWILIO = 'twilio',
  SNS = 'sns',
}

export type SendSmsParams = {
  to: string;
  body: string;
  from?: string;
};

export type SendSmsResult = {
  messageId: string;
  accepted: boolean;
};

export enum EmailProvider {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  SMTP = 'smtp',
}

export type SendEmailParams = {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  messageId: string;
  accepted: boolean;
};

export type SendBulkEmailParams = {
  messages: SendEmailParams[];
};

export type SendBulkEmailResult = {
  results: SendEmailResult[];
};

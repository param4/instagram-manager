import { Module, Global } from '@nestjs/common';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { EMAIL_PROVIDER_TOKEN } from './providers/email-provider.interface';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [
    EmailProviderFactory,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: async (factory: EmailProviderFactory) => {
        return factory.create();
      },
      inject: [EmailProviderFactory],
    },
    EmailService,
  ],
  exports: [EMAIL_PROVIDER_TOKEN, EmailService],
})
export class EmailModule {}

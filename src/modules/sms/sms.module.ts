import { Module, Global } from '@nestjs/common';
import { SmsProviderFactory } from './providers/sms-provider.factory';
import { SMS_PROVIDER_TOKEN } from './providers/sms-provider.interface';
import { SmsService } from './services/sms.service';

@Global()
@Module({
  providers: [
    SmsProviderFactory,
    {
      provide: SMS_PROVIDER_TOKEN,
      useFactory: async (factory: SmsProviderFactory) => {
        return factory.create();
      },
      inject: [SmsProviderFactory],
    },
    SmsService,
  ],
  exports: [SMS_PROVIDER_TOKEN, SmsService],
})
export class SmsModule {}

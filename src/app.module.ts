import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { InstagramModule } from './modules/instagram/instagram.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    HealthModule,
    // --- Add new feature modules below this line ---
    InstagramModule,
  ],
})
export class AppModule {}

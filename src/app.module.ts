import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'docs'),
      serveRoot: '/architecture',
    }),
    HealthModule,
    // --- Add new feature modules below this line ---
    InstagramModule,
  ],
})
export class AppModule {}

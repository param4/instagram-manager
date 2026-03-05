import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { YouTubeModule } from './modules/youtube/youtube.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'docs'),
      serveRoot: '/architecture',
    }),
    HealthModule,
    // --- Add new feature modules below this line ---
    InstagramModule,
    YouTubeModule,
  ],
})
export class AppModule {}

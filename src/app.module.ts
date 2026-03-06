import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessContextModule } from './modules/business-context/business-context.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { BusinessModule } from './modules/business/business.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { YouTubeModule } from './modules/youtube/youtube.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    StorageModule,
    AuthModule,
    // B2B Authorization — order matters for guard chain
    BusinessContextModule, // Must be AFTER AuthModule (BusinessContextGuard needs request.user)
    AuthorizationModule, // Must be AFTER BusinessContextModule (PermissionGuard needs business context)
    BusinessModule,
    UsersModule,
    TeamsModule,
    SuperAdminModule,
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

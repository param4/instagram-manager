import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { SuperAdminController } from './controllers/super-admin.controller';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { User } from '@modules/users/entities/user.entity';
import { BusinessModule } from '@modules/business/business.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), BusinessModule],
  controllers: [SuperAdminController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SuperAdminGuard,
    },
  ],
})
export class SuperAdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from './entities/business.entity';
import { BusinessService } from './services/business.service';
import { BusinessSeedService } from './services/business-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  providers: [BusinessService, BusinessSeedService],
  exports: [BusinessService, BusinessSeedService],
})
export class BusinessModule {}

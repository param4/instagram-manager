import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bundle } from './entities/bundle.entity';
import { Reel } from './entities/reel.entity';
import { BundleController } from './controllers/bundle.controller';
import { BundleService } from './services/bundle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bundle, Reel])],
  controllers: [BundleController],
  providers: [BundleService],
  exports: [BundleService],
})
export class BundleModule {}

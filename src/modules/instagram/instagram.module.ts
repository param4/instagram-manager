import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstagramPost } from './entities/instagram-post.entity';
import { InstagramAccount } from './entities/instagram-account.entity';
import { InstagramController } from './controllers/instagram.controller';
import { InstagramService } from './services/instagram.service';
import { InstagramApiService } from './services/instagram-api.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstagramPost, InstagramAccount])],
  controllers: [InstagramController],
  providers: [InstagramService, InstagramApiService, InstagramOAuthService],
  exports: [InstagramService, InstagramOAuthService],
})
export class InstagramModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YouTubeVideo } from './entities/youtube-video.entity';
import { YouTubeAccount } from './entities/youtube-account.entity';
import { YouTubeController } from './controllers/youtube.controller';
import { YouTubeService } from './services/youtube.service';
import { YouTubeApiService } from './services/youtube-api.service';
import { YouTubeOAuthService } from './services/youtube-oauth.service';

@Module({
  imports: [TypeOrmModule.forFeature([YouTubeVideo, YouTubeAccount])],
  controllers: [YouTubeController],
  providers: [YouTubeService, YouTubeApiService, YouTubeOAuthService],
  exports: [YouTubeService, YouTubeOAuthService],
})
export class YouTubeModule {}

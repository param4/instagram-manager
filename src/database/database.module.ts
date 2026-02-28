import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.dbHost,
        port: configService.dbPort,
        username: configService.dbUsername,
        password: configService.dbPassword,
        database: configService.dbName,
        autoLoadEntities: true,
        synchronize: configService.isDevelopment,
        ssl: configService.isProduction ? { rejectUnauthorized: false } : true,
      }),
    }),
  ],
})
export class DatabaseModule {}

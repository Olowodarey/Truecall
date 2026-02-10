import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FootballApiService } from './football-api.service';
import { FootballApiController } from './football-api.controller';
import { Match } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  controllers: [FootballApiController],
  providers: [FootballApiService],
  exports: [FootballApiService],
})
export class FootballApiModule {}

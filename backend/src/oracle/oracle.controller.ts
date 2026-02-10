import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { CreateEventDto, SubmitResultDto } from '../football-api/dto';
import { Event } from '../database/entities';

@Controller('api/oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Post('create-event')
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.oracleService.createEvent(
      createEventDto.eventName,
      createEventDto.matchId,
      createEventDto.accessCode,
    );
  }

  @Post('submit-result')
  async submitResult(@Body() submitResultDto: SubmitResultDto) {
    return this.oracleService.submitResult(submitResultDto.matchId);
  }

  @Post('close-event/:id')
  async closeEvent(@Param('id') id: number) {
    return this.oracleService.closeEvent(id);
  }

  @Get('events')
  async getAllEvents(): Promise<Event[]> {
    return this.oracleService.getAllEvents();
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: number): Promise<Event | null> {
    return this.oracleService.getEventById(id);
  }
}

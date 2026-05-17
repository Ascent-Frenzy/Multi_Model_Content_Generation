import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RescheduleDto } from '@app/dtos';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  list(@Req() req) {
    return this.scheduleService.list(req.user.id);
  }

  @Patch(':id/approve')
  approve(@Req() req, @Param('id') id: string) {
    return this.scheduleService.approve(id, req.user.id);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.scheduleService.reschedule(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.scheduleService.delete(id, req.user.id);
  }
}

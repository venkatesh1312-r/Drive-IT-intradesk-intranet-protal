import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CheckinVisitDto } from './dto/checkin-visit.dto';
import { WalkinVisitDto } from './dto/walkin-visit.dto';
import { RescheduleVisitDto } from './dto/reschedule-visit.dto';
import { CreateMyVisitDto } from './dto/create-my-visit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/visits')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  @Roles('HR', 'ADMIN')
  schedule(@Body() dto: CreateVisitDto, @Req() req: any) {
    return this.visitorsService.schedule(dto, req.user.id);
  }

  @Get()
  @Roles('HR', 'ADMIN')
  findAll(@Query('status') status?: string, @Query('date') date?: string) {
    return this.visitorsService.findAll({ status, date });
  }

  // Employee self-service — any authenticated user manages only their own guests
  @Get('mine')
  findMine(@Req() req: any) {
    return this.visitorsService.findMine(req.user.id);
  }

  @Post('mine')
  scheduleMine(@Body() dto: CreateMyVisitDto, @Req() req: any) {
    return this.visitorsService.scheduleMine(dto, req.user);
  }

  @Get('on-site')
  @Roles('HR', 'ADMIN')
  onSite() {
    return this.visitorsService.onSite();
  }

  @Get('calendar')
  @Roles('HR', 'ADMIN')
  calendar(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.visitorsService.calendar(startDate, endDate);
  }

  @Post('walk-in')
  @Roles('HR')
  walkIn(@Body() dto: WalkinVisitDto, @Req() req: any) {
    return this.visitorsService.walkIn(dto, req.user.id);
  }

  @Post(':id/check-in')
  @Roles('HR')
  checkIn(@Param('id', ParseIntPipe) id: number, @Body() dto: CheckinVisitDto) {
    return this.visitorsService.checkIn(id, dto);
  }

  @Post(':id/check-out')
  @Roles('HR')
  checkOut(@Param('id', ParseIntPipe) id: number) {
    return this.visitorsService.checkOut(id);
  }

  @Post(':id/cancel')
  @Roles('HR', 'ADMIN')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('cancellationNote') cancellationNote?: string) {
    return this.visitorsService.cancel(id, req.user, cancellationNote);
  }

  @Patch(':id')
  @Roles('HR', 'ADMIN')
  reschedule(@Param('id', ParseIntPipe) id: number, @Body() dto: RescheduleVisitDto, @Req() req: any) {
    return this.visitorsService.reschedule(id, dto, req.user);
  }
}

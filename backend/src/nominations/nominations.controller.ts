import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { CreateNominationDto, ApproveNominationDto } from './nominations.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/nominations')
export class NominationsController {
  constructor(private nominationsService: NominationsService) {}

  // Only HR and Admin may create nominations — employees can only view rewards they received
  @Post()
  @Roles('HR', 'ADMIN')
  create(@Body() dto: CreateNominationDto, @Request() req) {
    return this.nominationsService.create(dto, req.user.id);
  }

  @Get('mine')
  findMine(@Request() req) {
    return this.nominationsService.findMine(req.user.id);
  }

  @Get('received')
  findReceived(@Request() req) {
    return this.nominationsService.findReceived(req.user.name);
  }

  @Get('stats')
  @Roles('HR', 'ADMIN')
  getStats() {
    return this.nominationsService.getStats();
  }

  // HR sees only HR-category nominations; Admin sees all
  @Get()
  @Roles('HR', 'ADMIN')
  findAll(@Request() req) {
    if (req.user.role === 'HR') return this.nominationsService.findForHR();
    return this.nominationsService.findAll();
  }

  @Patch(':id/approve')
  @Roles('HR', 'ADMIN')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveNominationDto) {
    return this.nominationsService.approve(id, dto);
  }

  @Patch(':id/decline')
  @Roles('HR', 'ADMIN')
  decline(@Param('id', ParseIntPipe) id: number) {
    return this.nominationsService.decline(id);
  }

  // HR escalates to Admin; Admin can also escalate (e.g. for audit trail)
  @Patch(':id/escalate')
  @Roles('HR', 'ADMIN')
  escalate(@Param('id', ParseIntPipe) id: number) {
    return this.nominationsService.escalate(id);
  }
}

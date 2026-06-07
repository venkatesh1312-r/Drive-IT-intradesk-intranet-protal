import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { CreateNominationDto, ApproveNominationDto } from './nominations.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/nominations')
export class NominationsController {
  constructor(private nominationsService: NominationsService) {}

  @Post()
  @Roles('EMPLOYEE', 'ADMIN')
  create(@Body() dto: CreateNominationDto, @Request() req) {
    return this.nominationsService.create(dto, req.user.id);
  }

  @Get('mine')
  @Roles('EMPLOYEE', 'ADMIN')
  findMine(@Request() req) {
    return this.nominationsService.findMine(req.user.id);
  }

  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.nominationsService.getStats();
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.nominationsService.findAll();
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveNominationDto) {
    return this.nominationsService.approve(id, dto);
  }

  @Patch(':id/decline')
  @Roles('ADMIN')
  decline(@Param('id', ParseIntPipe) id: number) {
    return this.nominationsService.decline(id);
  }
}

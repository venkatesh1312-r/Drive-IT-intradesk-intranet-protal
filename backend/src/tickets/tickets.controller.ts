import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(dto, req.user.id);
  }

  @Get('analytics')
  @Roles('ADMIN')
  getAnalytics() {
    return this.ticketsService.getAnalytics();
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('department') department?: string,
    @Query('isBlocked') isBlocked?: string,
    @Query('search') search?: string,
    @Query('scope') scope?: string,
  ) {
    return this.ticketsService.findAll(req.user, {
      status,
      priority,
      department,
      search,
      scope,
      isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ticketsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto, @Req() req: any) {
    return this.ticketsService.update(id, dto, req.user);
  }
}

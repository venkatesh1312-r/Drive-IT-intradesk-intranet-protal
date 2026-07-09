import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { WorkLogService } from './work-log.service';
import { CreateWorkLogEntryDto, UpdateWorkLogEntryDto, WorkLogFilterDto, AddWorkLogCommentDto } from './work-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const CSV_COLUMNS = ['date', 'employee', 'email', 'project', 'type', 'description', 'link', 'tags', 'edited'] as const;

function toCsv(rows: Record<string, string>[]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map(r => CSV_COLUMNS.map(c => escape(r[c] ?? '')).join(','));
  return [header, ...lines].join('\n');
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/work-log')
export class WorkLogController {
  constructor(private workLogService: WorkLogService) {}

  @Post()
  create(@Body() dto: CreateWorkLogEntryDto, @Request() req) {
    return this.workLogService.create(dto, req.user.id);
  }

  @Get('mine')
  findMine(@Request() req) {
    return this.workLogService.findMine(req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkLogEntryDto, @Request() req) {
    return this.workLogService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.workLogService.remove(id, req.user.id);
  }

  @Get('overview')
  @Roles('HR', 'ADMIN')
  getOverview() {
    return this.workLogService.getOverview();
  }

  @Get('export')
  @Roles('HR', 'ADMIN')
  async export(@Query() filter: WorkLogFilterDto, @Res() res: Response) {
    const rows = await this.workLogService.exportRows(filter);
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="work-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get()
  @Roles('HR', 'ADMIN')
  findAggregate(@Query() filter: WorkLogFilterDto) {
    return this.workLogService.findAggregate(filter);
  }

  @Post(':id/comments')
  @Roles('HR', 'ADMIN')
  addComment(@Param('id', ParseIntPipe) id: number, @Body() dto: AddWorkLogCommentDto, @Request() req) {
    return this.workLogService.addComment(id, req.user.id, dto.message);
  }
}

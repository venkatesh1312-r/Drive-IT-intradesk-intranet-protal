import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddProjectMemberDto } from './projects.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // Active projects the current user is assigned to — used for the Work Log dropdown
  @Get('mine')
  findMine(@Request() req) {
    return this.projectsService.findMine(req.user.id);
  }

  @Get()
  @Roles('HR', 'ADMIN')
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  @Roles('HR', 'ADMIN')
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @Roles('HR', 'ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Get(':id/members')
  @Roles('HR', 'ADMIN')
  listMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.listMembers(id);
  }

  @Post(':id/members')
  @Roles('HR', 'ADMIN')
  addMember(@Param('id', ParseIntPipe) id: number, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @Roles('HR', 'ADMIN')
  removeMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) {
    return this.projectsService.removeMember(id, userId);
  }
}

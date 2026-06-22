import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { EditCommentDto } from './dto/edit-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.create(ticketId, dto.message, req.user);
  }

  @Get()
  findAll(@Param('ticketId', ParseIntPipe) ticketId: number, @Req() req: any) {
    return this.commentsService.findAll(ticketId, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.update(id, dto.message, req.user.id);
  }
}

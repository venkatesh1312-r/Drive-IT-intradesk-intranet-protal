import { Controller, Get, Patch, Delete, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Delete('clear-all')
  clearAll(@Req() req: any) {
    return this.notificationsService.clearAll(req.user.id);
  }

  @Patch(':id/read')
  markOneRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markOneRead(id, req.user.id);
  }
}

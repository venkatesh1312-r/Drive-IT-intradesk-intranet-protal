import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { NominationsModule } from './nominations/nominations.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkLogModule } from './work-log/work-log.module';

@Module({
  imports: [AuthModule, NominationsModule, UsersModule, TicketsModule, CommentsModule, NotificationsModule, AuditModule, VisitorsModule, ProjectsModule, WorkLogModule],
})
export class AppModule {}

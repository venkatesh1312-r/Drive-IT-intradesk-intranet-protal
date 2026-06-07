import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { NominationsModule } from './nominations/nominations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, NominationsModule, UsersModule],
})
export class AppModule {}

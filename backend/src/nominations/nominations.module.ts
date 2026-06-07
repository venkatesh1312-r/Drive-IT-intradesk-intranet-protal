import { Module } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { NominationsController } from './nominations.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [NominationsController],
  providers: [NominationsService, PrismaService],
})
export class NominationsModule {}

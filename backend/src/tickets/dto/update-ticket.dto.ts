import { IsString, IsEnum, IsOptional, IsInt, IsBoolean } from 'class-validator';

export enum TicketStatusEnum {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  REASSIGNED = 'REASSIGNED',
}

export enum TicketPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class UpdateTicketDto {
  @IsEnum(TicketStatusEnum)
  @IsOptional()
  status?: TicketStatusEnum;

  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;

  @IsInt()
  @IsOptional()
  assignedToId?: number;

  @IsString()
  @IsOptional()
  resolutionNote?: string;

  @IsString()
  @IsOptional()
  blockedReason?: string;

  @IsBoolean()
  @IsOptional()
  unblock?: boolean;
}

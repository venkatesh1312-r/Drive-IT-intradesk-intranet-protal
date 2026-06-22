import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum TicketDepartment {
  IT = 'IT',
  HR = 'HR',
}

export enum TicketPriorityEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(TicketDepartment)
  department: TicketDepartment;

  @IsEnum(TicketPriorityEnum)
  @IsOptional()
  priority?: TicketPriorityEnum;
}

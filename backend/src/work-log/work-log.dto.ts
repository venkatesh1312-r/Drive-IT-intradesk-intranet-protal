import { IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ContributionType } from '@prisma/client';

export class CreateWorkLogEntryDto {
  @IsInt()
  @Type(() => Number)
  projectId: number;

  @IsEnum(ContributionType)
  contributionType: ContributionType;

  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateWorkLogEntryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsEnum(ContributionType)
  contributionType?: ContributionType;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class WorkLogFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  employeeId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsEnum(ContributionType)
  contributionType?: ContributionType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class AddWorkLogCommentDto {
  @IsNotEmpty()
  message: string;
}

import {
  IsString, IsInt, IsOptional, IsDateString, IsArray,
  Min, Max, MinLength, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VisitorInputDto } from './visitor-input.dto';

export class CreateVisitDto {
  @IsString()
  @MinLength(1)
  visitorCompany: string;

  @IsString()
  @MinLength(1)
  purpose: string;

  @IsInt()
  @Min(1)
  @Max(10)
  numberOfVisitors: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VisitorInputDto)
  visitors: VisitorInputDto[];

  // Optional FK to the host user (for notification). Name is always stored.
  @IsOptional()
  @IsInt()
  hostId?: number;

  @IsString()
  @MinLength(1)
  hostName: string;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  @MinLength(1)
  expectedCheckInTime: string;

  @IsString()
  @MinLength(1)
  expectedCheckOutTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

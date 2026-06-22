import {
  IsString, IsInt, IsOptional, IsDateString, IsArray,
  Min, Max, MinLength, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VisitorInputDto } from './visitor-input.dto';

// Employee self-service scheduling — the host is implicitly the requesting user,
// so hostId / hostName are set server-side rather than accepted from the client.
export class CreateMyVisitDto {
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

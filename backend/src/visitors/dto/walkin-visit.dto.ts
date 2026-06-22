import {
  IsString, IsInt, IsOptional, IsArray,
  Min, Max, MinLength, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WalkinVisitorInputDto } from './visitor-input.dto';

// Walk-in: visitors are already on-site, so there is no date or expected times.
// Each visitor carries their own Govt ID / Badge number.
export class WalkinVisitDto {
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
  @Type(() => WalkinVisitorInputDto)
  visitors: WalkinVisitorInputDto[];

  @IsOptional()
  @IsInt()
  hostId?: number;

  @IsString()
  @MinLength(1)
  hostName: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

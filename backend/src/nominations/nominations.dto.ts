import { IsNotEmpty, IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { NominationCategory } from '@prisma/client';

export class CreateNominationDto {
  @IsNotEmpty()
  projectName: string;

  @IsNotEmpty()
  nomineeName: string;

  @IsNotEmpty()
  nominatedBy: string;

  @IsEnum(NominationCategory)
  category: NominationCategory;

  @IsNotEmpty()
  context: string;
}

export class ApproveNominationDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  points: number;
}

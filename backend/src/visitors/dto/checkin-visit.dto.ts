import { IsString, MinLength } from 'class-validator';

export class CheckinVisitDto {
  @IsString()
  @MinLength(1)
  visitorIdNumber: string;
}

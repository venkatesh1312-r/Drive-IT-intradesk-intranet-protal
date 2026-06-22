import { IsString, IsDateString, MinLength } from 'class-validator';

// Reschedule may ONLY change the date and expected times. Any other field sent
// in the body is stripped by the global ValidationPipe (whitelist) and never applied.
export class RescheduleVisitDto {
  @IsDateString()
  scheduledDate: string;

  @IsString()
  @MinLength(1)
  expectedCheckInTime: string;

  @IsString()
  @MinLength(1)
  expectedCheckOutTime: string;
}

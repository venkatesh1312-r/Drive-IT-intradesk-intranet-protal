import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';

// One visitor within a visit booking (scheduled / employee self-service).
export class VisitorInputDto {
  @IsString()
  @MinLength(1)
  name: string;

  // Optional — frontend omits the field entirely when left blank.
  @IsOptional()
  @IsEmail()
  email?: string;

  // Standard 10-digit phone number (digits only).
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits.' })
  phone: string;
}

// Walk-in visitors additionally require a Govt ID / Badge number captured on arrival.
export class WalkinVisitorInputDto extends VisitorInputDto {
  @IsString()
  @MinLength(1)
  govtIdNumber: string;
}

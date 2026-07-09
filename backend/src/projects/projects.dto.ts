import { IsNotEmpty, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddProjectMemberDto {
  @IsInt()
  userId: number;
}

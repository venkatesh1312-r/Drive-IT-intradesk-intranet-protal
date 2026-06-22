import { IsString, IsNotEmpty } from 'class-validator';

export class EditCommentDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

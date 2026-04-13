import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;
}

export class ReplyContactDto {
  @IsNotEmpty()
  @IsString()
  replyMessage!: string;
}

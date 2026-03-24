import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  name: string;
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

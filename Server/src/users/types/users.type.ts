import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsStrongPassword,
} from 'class-validator';

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  refreshToken?: string;
  role: string;
};

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;
  @IsStrongPassword()
  password: string;
}

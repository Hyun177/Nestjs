import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsStrongPassword,
  IsOptional,
} from 'class-validator';

export type User = {
  id: number;
  name?: string;
  email: string;
  password: string;
  refreshToken?: string;
  role: string;
  phone?: string;
  address?: string;
  avatar?: string;
  firstname: string;
  lastname: string;
};

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstname: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastname: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  role?: string;
}

import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsStrongPassword,
  IsOptional,
} from 'class-validator';
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

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
  firstname?: string;
  @IsString()
  @IsOptional()
  lastname?: string;
}

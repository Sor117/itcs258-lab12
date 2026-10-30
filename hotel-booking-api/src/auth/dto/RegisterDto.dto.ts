import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'alice',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  username!: string;

  @ApiProperty({
    description: 'Password, stored as a bcrypt hash',
    example: 'strong-password',
    format: 'password',
    maxLength: 72,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(72)
  password!: string;
}

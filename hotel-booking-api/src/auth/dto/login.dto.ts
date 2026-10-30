import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Registered username', example: 'alice' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  username!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'strong-password',
    format: 'password',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(72)
  password!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Display name of the room',
    example: 'Deluxe Sea View Suite',
    type: String,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Details such as the view, bed type and amenities',
    example: 'Sea view, king bed, private balcony',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

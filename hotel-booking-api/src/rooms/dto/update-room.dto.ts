import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

// Every CreateRoomDto field becomes optional, keeping its validation rules and
// Swagger metadata.
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

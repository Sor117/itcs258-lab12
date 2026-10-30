import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomCacheInterceptor } from './room-cache.interceptor';
import {
  BODY_VALIDATION_ERROR_SCHEMA,
  DELETED_ROOM_SCHEMA,
  FORBIDDEN_SCHEMA,
  ID_VALIDATION_ERROR_SCHEMA,
  PAGINATED_ROOMS_SCHEMA,
  QUERY_VALIDATION_ERROR_SCHEMA,
  ROOM_NOT_FOUND_SCHEMA,
  ROOM_SCHEMA,
  TOO_MANY_REQUESTS_SCHEMA,
  UNAUTHORIZED_SCHEMA,
} from './rooms.swagger';
import { RoomsService } from './rooms.service';

const ROOM_ID_PARAM = {
  name: 'id',
  type: Number,
  description: 'Room ID',
  example: 1,
};

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @UseInterceptors(RoomCacheInterceptor)
  @ApiOperation({
    summary: 'List rooms',
    description:
      'Returns one page of rooms ordered by ID, with pagination metadata. ' +
      'Responses are cached in Redis for 5 minutes.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, starting at 1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Rooms per page (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Only return rooms whose name or description contains this text',
    example: 'deluxe',
  })
  @ApiResponse({
    status: 200,
    description: 'A page of rooms',
    schema: PAGINATED_ROOMS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid page, limit or search value',
    schema: QUERY_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  findAll(@Query() query: RoomQueryDto) {
    return this.roomsService.findAll(query);
  }

  @Get(':id')
  @UseInterceptors(RoomCacheInterceptor)
  @ApiOperation({
    summary: 'Get a room by ID',
    description: 'Responses are cached in Redis for 5 minutes.',
  })
  @ApiParam(ROOM_ID_PARAM)
  @ApiResponse({ status: 200, description: 'The room', schema: ROOM_SCHEMA })
  @ApiResponse({
    status: 400,
    description: 'The ID is not a number',
    schema: ID_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'No room has this ID',
    schema: ROOM_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a room (ADMIN only)',
    description: 'The signed-in admin is saved as the room creator.',
  })
  @ApiResponse({
    status: 201,
    description: 'The room was created',
    schema: ROOM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'The request body failed validation',
    schema: BODY_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'The user is not an ADMIN',
    schema: FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  create(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.roomsService.create(createRoomDto, userId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a room (ADMIN only)',
    description: 'Only the fields sent in the body are changed.',
  })
  @ApiParam(ROOM_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'The updated room',
    schema: ROOM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID or request body',
    schema: BODY_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'The user is not an ADMIN',
    schema: FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'No room has this ID',
    schema: ROOM_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  @ApiOperation({
    summary: 'Update a room (ADMIN only)',
    description: 'Accepts the same body as PATCH /rooms/{id}.',
  })
  @ApiParam(ROOM_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'The updated room',
    schema: ROOM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID or request body',
    schema: BODY_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'The user is not an ADMIN',
    schema: FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'No room has this ID',
    schema: ROOM_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room (ADMIN only)' })
  @ApiParam(ROOM_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'The room was deleted; the body echoes the deleted room',
    schema: DELETED_ROOM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'The ID is not a number',
    schema: ID_VALIDATION_ERROR_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid or expired JWT',
    schema: UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'The user is not an ADMIN',
    schema: FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'No room has this ID',
    schema: ROOM_NOT_FOUND_SCHEMA,
  })
  @ApiResponse({
    status: 429,
    description: 'More than 10 requests in one minute',
    schema: TOO_MANY_REQUESTS_SCHEMA,
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.remove(id);
    return { message: `Room ${id} deleted`, room };
  }
}

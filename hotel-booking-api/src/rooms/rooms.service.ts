import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Room } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

export interface PaginatedRooms {
  data: Room[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(query: Partial<RoomQueryDto> = {}): Promise<PaginatedRooms> {
    const { page = 1, limit = 10, search } = query;
    const where: Prisma.RoomWhereInput = search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room ${id} was not found`);
    }
    return room;
  }

  async create(createRoomDto: CreateRoomDto, userId: number): Promise<Room> {
    const room = await this.prisma.room.create({
      data: {
        ...createRoomDto,
        createdBy: userId,
      },
    });
    await this.invalidateRoomCache();
    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    try {
      const room = await this.prisma.room.update({
        where: { id },
        data: updateRoomDto,
      });
      await this.invalidateRoomCache();
      return room;
    } catch (error: unknown) {
      this.rethrowNotFound(error, id);
    }
  }

  async remove(id: number): Promise<Room> {
    try {
      const room = await this.prisma.room.delete({ where: { id } });
      await this.invalidateRoomCache();
      return room;
    } catch (error: unknown) {
      this.rethrowNotFound(error, id);
    }
  }

  // List responses are cached per URL, so every page/limit/search combination
  // has its own key. Clear the room-api namespace instead of tracking each one.
  private async invalidateRoomCache(): Promise<void> {
    await this.cache.clear();
  }

  private rethrowNotFound(error: unknown, id: number): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Room ${id} was not found`);
    }
    throw error;
  }
}

/*
AI Declaration:
I used Claude Code (Anthropic's AI coding assistant) to write the Room unit,
integration and end-to-end tests for this lab.

Reflection:
[Write 1-2 sentences in your own words about what you learned from this lab or how
using AI affected your understanding. Replace this prompt before submitting.]
*/

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Room } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from './rooms.service';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe('RoomsService', () => {
  let service: RoomsService;
  const prisma = {
    room: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const cache = { clear: jest.fn() };

  const room: Room = {
    id: 1,
    name: 'Deluxe Sea View Suite',
    description: 'Sea view, king bed',
    createdBy: 7,
    createdAt: new Date('2026-10-21T08:30:00.000Z'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    cache.clear.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('saves the room with the creator ID and clears the room cache', async () => {
      const dto = { name: 'Deluxe Sea View Suite', description: 'Sea view' };
      prisma.room.create.mockResolvedValue(room);

      await expect(service.create(dto, 7)).resolves.toEqual(room);
      expect(prisma.room.create).toHaveBeenCalledWith({
        data: { ...dto, createdBy: 7 },
      });
      expect(cache.clear).toHaveBeenCalledTimes(1);
    });

    it('rethrows database errors and leaves the cache untouched', async () => {
      // P2003: foreign key failure, e.g. the creator was deleted.
      const error = prismaError('P2003');
      prisma.room.create.mockRejectedValue(error);

      await expect(service.create({ name: 'Orphan room' }, 999)).rejects.toBe(
        error,
      );
      expect(cache.clear).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the first page of rooms with pagination metadata by default', async () => {
      prisma.room.findMany.mockResolvedValue([room]);
      prisma.room.count.mockResolvedValue(1);

      await expect(service.findAll()).resolves.toEqual({
        data: [room],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: 'asc' },
        skip: 0,
        take: 10,
      });
      expect(prisma.room.count).toHaveBeenCalledWith({ where: {} });
    });

    it('applies page, limit and search to the query', async () => {
      prisma.room.findMany.mockResolvedValue([]);
      prisma.room.count.mockResolvedValue(12);

      await expect(
        service.findAll({ page: 3, limit: 5, search: 'deluxe' }),
      ).resolves.toEqual({
        data: [],
        meta: { total: 12, page: 3, limit: 5, totalPages: 3 },
      });

      const where = {
        OR: [
          { name: { contains: 'deluxe' } },
          { description: { contains: 'deluxe' } },
        ],
      };
      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { id: 'asc' },
        skip: 10,
        take: 5,
      });
      expect(prisma.room.count).toHaveBeenCalledWith({ where });
    });

    it('rethrows database errors', async () => {
      const error = new Error('Database connection lost');
      prisma.room.findMany.mockRejectedValue(error);
      prisma.room.count.mockResolvedValue(0);

      await expect(service.findAll()).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('returns the room with the given ID', async () => {
      prisma.room.findUnique.mockResolvedValue(room);

      await expect(service.findOne(1)).resolves.toEqual(room);
      expect(prisma.room.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when the room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      const result = service.findOne(99);
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
      await expect(result).rejects.toThrow('Room 99 was not found');
    });
  });

  describe('update', () => {
    it('updates the room by ID and clears the room cache', async () => {
      const updated = { ...room, name: 'Renovated Suite' };
      prisma.room.update.mockResolvedValue(updated);

      await expect(
        service.update(1, { name: 'Renovated Suite' }),
      ).resolves.toEqual(updated);
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Renovated Suite' },
      });
      expect(cache.clear).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when Prisma reports a missing record (P2025)', async () => {
      prisma.room.update.mockRejectedValue(prismaError('P2025'));

      const result = service.update(99, { name: 'Ghost room' });
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
      await expect(result).rejects.toThrow('Room 99 was not found');
      expect(cache.clear).not.toHaveBeenCalled();
    });

    it('rethrows other database errors unchanged', async () => {
      const error = prismaError('P2000'); // value too long for the column
      prisma.room.update.mockRejectedValue(error);

      await expect(service.update(1, { name: 'x' })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('deletes the room by ID and clears the room cache', async () => {
      prisma.room.delete.mockResolvedValue(room);

      await expect(service.remove(1)).resolves.toEqual(room);
      expect(prisma.room.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(cache.clear).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the room does not exist', async () => {
      prisma.room.delete.mockRejectedValue(prismaError('P2025'));

      const result = service.remove(99);
      await expect(result).rejects.toBeInstanceOf(NotFoundException);
      await expect(result).rejects.toThrow('Room 99 was not found');
      expect(cache.clear).not.toHaveBeenCalled();
    });

    it('rethrows other deletion errors and leaves the cache untouched', async () => {
      const error = new Error('Database connection lost');
      prisma.room.delete.mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toBe(error);
      expect(cache.clear).not.toHaveBeenCalled();
    });
  });
});

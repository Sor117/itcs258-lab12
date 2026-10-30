/*
AI Declaration:
I used Claude Code (Anthropic's AI coding assistant) to write the Room unit,
integration and end-to-end tests for this lab.

Reflection:
[Write 1-2 sentences in your own words about what you learned from this lab or how
using AI affected your understanding. Replace this prompt before submitting.]
*/

import {
  CallHandler,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RoomCacheInterceptor } from './room-cache.interceptor';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController (integration)', () => {
  let app: INestApplication<App>;
  let controller: RoomsController;
  const roomsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const admin: JwtPayload = { sub: 7, username: 'admin', role: Role.ADMIN };

  // A room as it appears in a JSON response.
  const room = {
    id: 1,
    name: 'Deluxe Sea View Suite',
    description: 'Sea view, king bed',
    createdBy: admin.sub,
    createdAt: '2026-10-21T08:30:00.000Z',
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [{ provide: RoomsService, useValue: roomsService }],
    })
      // Skip JWT verification but still attach the user @CurrentUser reads.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user?: JwtPayload }>().user =
            admin;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(RoomCacheInterceptor)
      .useValue({
        intercept: (_context: ExecutionContext, next: CallHandler) =>
          next.handle(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    controller = moduleRef.get<RoomsController>(RoomsController);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /rooms', () => {
    it('creates the room through RoomsService.create and returns it', async () => {
      roomsService.create.mockResolvedValue(room);

      const res = await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: room.name, description: room.description })
        .expect(201);

      expect(res.body).toEqual(room);
      expect(roomsService.create).toHaveBeenCalledWith(
        { name: room.name, description: room.description },
        admin.sub,
      );
    });

    it('rejects an invalid body with 400 and never calls the service', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .send({ name: '', price: 1200 })
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([
          'property price should not exist',
          'name should not be empty',
        ]) as unknown,
      });
      expect(roomsService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /rooms', () => {
    const page = {
      data: [room],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('returns the list from RoomsService.findAll', async () => {
      roomsService.findAll.mockResolvedValue(page);

      const res = await request(app.getHttpServer()).get('/rooms').expect(200);

      expect(res.body).toEqual(page);
      expect(roomsService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('passes parsed query parameters to the service', async () => {
      roomsService.findAll.mockResolvedValue(page);

      await request(app.getHttpServer())
        .get('/rooms')
        .query({ page: 2, limit: 5, search: 'deluxe' })
        .expect(200);

      expect(roomsService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'deluxe',
      });
    });

    it('rejects an out-of-range limit with 400', async () => {
      await request(app.getHttpServer())
        .get('/rooms')
        .query({ limit: 500 })
        .expect(400);

      expect(roomsService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /rooms/:id', () => {
    it('returns the room from RoomsService.findOne', async () => {
      roomsService.findOne.mockResolvedValue(room);

      const res = await request(app.getHttpServer())
        .get('/rooms/1')
        .expect(200);

      expect(res.body).toEqual(room);
      expect(roomsService.findOne).toHaveBeenCalledWith(1);
    });

    it('returns 404 when the service throws NotFoundException', async () => {
      roomsService.findOne.mockRejectedValue(
        new NotFoundException('Room 99 was not found'),
      );

      const res = await request(app.getHttpServer())
        .get('/rooms/99')
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: 'Room 99 was not found',
        error: 'Not Found',
      });
      expect(roomsService.findOne).toHaveBeenCalledWith(99);
    });

    it('rejects a non-numeric ID with 400', async () => {
      await request(app.getHttpServer()).get('/rooms/abc').expect(400);

      expect(roomsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PUT /rooms/:id', () => {
    it('updates through RoomsService.update with the ID and body', async () => {
      const updated = { ...room, name: 'Renovated Suite' };
      roomsService.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .put('/rooms/1')
        .send({ name: 'Renovated Suite' })
        .expect(200);

      expect(res.body).toEqual(updated);
      expect(roomsService.update).toHaveBeenCalledWith(1, {
        name: 'Renovated Suite',
      });
    });

    it('returns 404 when the room does not exist', async () => {
      roomsService.update.mockRejectedValue(
        new NotFoundException('Room 99 was not found'),
      );

      await request(app.getHttpServer())
        .put('/rooms/99')
        .send({ name: 'Ghost room' })
        .expect(404);

      expect(roomsService.update).toHaveBeenCalledWith(99, {
        name: 'Ghost room',
      });
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('deletes through RoomsService.remove and returns a confirmation', async () => {
      roomsService.remove.mockResolvedValue(room);

      const res = await request(app.getHttpServer())
        .delete('/rooms/1')
        .expect(200);

      expect(res.body).toEqual({ message: 'Room 1 deleted', room });
      expect(roomsService.remove).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException (404) when the room does not exist', async () => {
      roomsService.remove.mockRejectedValue(
        new NotFoundException('Room 99 was not found'),
      );

      await expect(controller.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await request(app.getHttpServer()).delete('/rooms/99').expect(404);
      expect(roomsService.remove).toHaveBeenCalledWith(99);
    });
  });
});

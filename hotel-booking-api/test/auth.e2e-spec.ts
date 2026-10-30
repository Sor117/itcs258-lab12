import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, Room, User } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { createCache } from 'cache-manager';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface RegistrationResponse {
  id: number;
  username: string;
  role: Role;
}

interface LoginResponse {
  access_token: string;
}

interface RoomResponse {
  id: number;
  name: string;
  createdBy: number | null;
}

interface RoomListResponse {
  data: RoomResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('Authentication and role-protected rooms (e2e)', () => {
  let app: INestApplication<App>;
  let userId: number | undefined;
  let adminId: number | undefined;
  let userToken: string;
  const users = new Map<number, User>();
  const rooms = new Map<number, Room>();
  let nextUserId = 1;
  let nextRoomId = 1;

  const prisma = {
    user: {
      create: jest.fn(
        ({ data }: { data: { username: string; password: string } }) => {
          if (
            [...users.values()].some((user) => user.username === data.username)
          ) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Duplicate username',
              {
                code: 'P2002',
                clientVersion: Prisma.prismaVersion.client,
              },
            );
          }
          const user: User = {
            id: nextUserId++,
            ...data,
            role: Role.USER,
            createdAt: new Date(),
          };
          users.set(user.id, user);
          return Promise.resolve(user);
        },
      ),
      findUnique: jest.fn(({ where }: { where: { username: string } }) =>
        Promise.resolve(
          [...users.values()].find(
            (user) => user.username === where.username,
          ) ?? null,
        ),
      ),
      update: jest.fn(
        ({ where, data }: { where: { id: number }; data: { role: Role } }) => {
          const user = users.get(where.id)!;
          const updated = { ...user, ...data };
          users.set(where.id, updated);
          return Promise.resolve(updated);
        },
      ),
    },
    room: {
      findMany: jest.fn(() => Promise.resolve([...rooms.values()])),
      count: jest.fn(() => Promise.resolve(rooms.size)),
      findUnique: jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve(rooms.get(where.id) ?? null),
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { name: string; description?: string; createdBy: number };
        }) => {
          const room: Room = {
            id: nextRoomId++,
            ...data,
            description: data.description ?? null,
            createdAt: new Date(),
          };
          rooms.set(room.id, room);
          return Promise.resolve(room);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: number };
          data: { name?: string };
        }) => {
          const updated = { ...rooms.get(where.id)!, ...data };
          rooms.set(where.id, updated);
          return Promise.resolve(updated);
        },
      ),
      delete: jest.fn(({ where }: { where: { id: number } }) => {
        const room = rooms.get(where.id)!;
        rooms.delete(where.id);
        return Promise.resolve(room);
      }),
    },
  };

  const username = `rbac_user_${Date.now()}`;
  const adminUsername = `rbac_admin_${Date.now()}`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(CACHE_MANAGER)
      .useValue(createCache({ ttl: 300_000 }))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  it('registers USER by default and restricts room writes to ADMIN', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, password })
      .expect(201);

    const registrationBody = registration.body as RegistrationResponse;
    userId = registrationBody.id;
    expect(registrationBody).toMatchObject({ username, role: Role.USER });
    expect(registrationBody).not.toHaveProperty('password');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'self_promoted', password, role: Role.ADMIN })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, password })
      .expect(409);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password })
      .expect(200);

    userToken = (login.body as LoginResponse).access_token;
    expect(userToken).toEqual(expect.any(String));

    const userProfile = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(userProfile.body).toMatchObject({ sub: userId, role: Role.USER });

    const adminRegistration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: adminUsername, password })
      .expect(201);
    adminId = (adminRegistration.body as RegistrationResponse).id;
    // Promotion is trusted administration, never a public registration option.
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: adminUsername, password })
      .expect(200);
    const adminToken = (adminLogin.body as LoginResponse).access_token;
    const adminProfile = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminProfile.body).toMatchObject({ sub: adminId, role: Role.ADMIN });

    await request(app.getHttpServer()).get('/rooms').expect(401);

    await request(app.getHttpServer())
      .post('/rooms')
      .send({ name: 'Unauthenticated room' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Forbidden room' })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'JWT test room', description: 'Created by e2e test' })
      .expect(201);

    const createdRoom = created.body as RoomResponse;
    const roomId = createdRoom.id;
    expect(createdRoom).toMatchObject({
      name: 'JWT test room',
      createdBy: adminId,
    });

    const rooms = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(rooms.headers['x-cache']).toBe('MISS');
    const roomList = rooms.body as RoomListResponse;
    expect(roomList.data.some((room) => room.id === roomId)).toBe(true);
    expect(roomList.meta).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const cachedRooms = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(cachedRooms.headers['x-cache']).toBe('HIT');

    const fetched = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect((fetched.body as RoomResponse).id).toBe(roomId);
    expect(fetched.headers['x-cache']).toBe('MISS');

    const cachedRoom = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(cachedRoom.headers['x-cache']).toBe('HIT');

    await request(app.getHttpServer())
      .patch(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Forbidden patch' })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Forbidden put' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated JWT test room' })
      .expect(200);
    expect((updated.body as RoomResponse).name).toBe('Updated JWT test room');

    const afterUpdate = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(afterUpdate.headers['x-cache']).toBe('MISS');
    expect((afterUpdate.body as RoomResponse).name).toBe(
      'Updated JWT test room',
    );

    const replaced = await request(app.getHttpServer())
      .put(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Replaced JWT test room' })
      .expect(200);
    expect((replaced.body as RoomResponse).name).toBe('Replaced JWT test room');

    const deleted = await request(app.getHttpServer())
      .delete(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(deleted.body).toMatchObject({
      message: `Room ${roomId} deleted`,
      room: { id: roomId },
    });

    const afterDelete = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(afterDelete.headers['x-cache']).toBe('MISS');
    expect(
      (afterDelete.body as RoomListResponse).data.some(
        (room) => room.id === roomId,
      ),
    ).toBe(false);
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  it('returns 429 after ten requests to a room endpoint in one minute', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const response = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${userToken}`);
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });

  afterAll(async () => {
    await app.close();
  });
});

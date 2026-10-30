/*
AI Declaration:
I used Claude Code to Clasify how to integration.

Reflection:
I know how to make it test with command npm
*/

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createCache } from 'cache-manager';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface RoomResponse {
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
}

interface RoomListResponse {
  data: RoomResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Runs against the MySQL database in DATABASE_URL (.env). The test seeds its
// own ADMIN user, and afterAll deletes that user and every room it created.
describe('Rooms API lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: number | undefined;
  let accessToken: string;
  let roomId: number;

  const runId = Date.now();
  const adminUsername = `e2e_admin_${runId}`;
  const adminPassword = 'e2e-admin-password';
  const roomName = `E2E Room ${runId}`;
  const renamedRoom = `${roomName} (renovated)`;
  // Largest MySQL INT; auto-increment never reaches it in a lab database.
  const missingRoomId = 2_147_483_647;

  const bearer = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // In-memory cache instead of Redis, so no Redis server is needed.
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
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: await bcrypt.hash(adminPassword, 12),
        role: Role.ADMIN,
      },
    });
    adminId = admin.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: adminUsername, password: adminPassword })
      .expect(200);
    accessToken = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    if (adminId !== undefined) {
      await prisma.room.deleteMany({ where: { createdBy: adminId } });
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await app?.close();
  });

  it('creates a room (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .set(bearer())
      .send({ name: roomName, description: 'Created by the e2e test' })
      .expect(201);

    const room = res.body as RoomResponse;
    expect(room).toMatchObject({
      name: roomName,
      description: 'Created by the e2e test',
      createdBy: adminId,
    });
    roomId = room.id;
  });

  it('rejects room creation without a token (401 Unauthorized)', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({ name: 'Unauthorized room' })
      .expect(401);
  });

  it('lists rooms and includes the created room', async () => {
    const all = await request(app.getHttpServer())
      .get('/rooms')
      .set(bearer())
      .expect(200);
    expect((all.body as RoomListResponse).meta.total).toBeGreaterThanOrEqual(1);

    // The shared database can hold more rooms than one page, so search by
    // the unique test name to find this run's room.
    const res = await request(app.getHttpServer())
      .get('/rooms')
      .query({ search: roomName })
      .set(bearer())
      .expect(200);

    const list = res.body as RoomListResponse;
    expect(list.data.map((room) => room.id)).toEqual([roomId]);
    expect(list.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('gets the created room by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set(bearer())
      .expect(200);

    expect(res.body).toMatchObject({
      id: roomId,
      name: roomName,
      createdBy: adminId,
    });
  });

  it('updates the room with PUT (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/rooms/${roomId}`)
      .set(bearer())
      .send({ name: renamedRoom, description: 'Updated by the e2e test' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: roomId,
      name: renamedRoom,
      description: 'Updated by the e2e test',
    });
    await expect(
      prisma.room.findUnique({ where: { id: roomId } }),
    ).resolves.toMatchObject({ name: renamedRoom });
  });

  it('returns 404 when updating a room that does not exist', async () => {
    await request(app.getHttpServer())
      .put(`/rooms/${missingRoomId}`)
      .set(bearer())
      .send({ name: 'Ghost room' })
      .expect(404);
  });

  it('deletes the room (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/rooms/${roomId}`)
      .set(bearer())
      .expect(200);

    expect(res.body).toMatchObject({
      message: `Room ${roomId} deleted`,
      room: { id: roomId, name: renamedRoom },
    });
  });

  it('returns 404 for the deleted room', async () => {
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set(bearer())
      .expect(404);
  });
});

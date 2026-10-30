import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createCache } from 'cache-manager';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(CACHE_MANAGER)
      .useValue(createCache({ ttl: 300_000 }))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('limits non-room endpoints to 100 requests per minute', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/').expect(200);
    }
    await request(app.getHttpServer()).get('/').expect(429);
  });

  afterEach(async () => {
    await app.close();
  });
});

/*
AI Declaration:
I used Claude only to clarify swagger.
No code was directly copied without modification.

Reflection:
I know how to use swagger and how it work
*/

import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const API_DESCRIPTION = `REST API for the Hotel Booking System.
**Rooms**: any signed-in user can list, search and view hotel rooms. Only ADMIN users can create, update and delete rooms.
**Bookings**: booking management covers reserving a room for a date range. Booking endpoints will appear under the \`bookings\` tag; this version documents the Room API.
**Authentication**: call \`POST /auth/login\`, click **Authorize**, and paste the returned \`access_token\`. Endpoints with a lock icon need this JWT.
**Rate limiting**: each client IP can make up to 100 requests per minute. Each Room endpoint has a stricter limit of 10 requests per minute. Requests over a limit receive \`429 Too Many Requests\`.`;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Hotel Booking System API')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0.0')
    .addTag('rooms', 'Hotel room management')
    .addTag('bookings', 'Room booking management')
    .addTag('auth', 'Registration, login and the current user profile')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the access_token returned by POST /auth/login',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

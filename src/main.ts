import { webcrypto } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as session from 'express-session';
import * as hbs from 'hbs';
import { AppModule } from './app.module';

// Node 18 doesn't expose `crypto` as a global, which @nestjs/schedule needs.
if (!(globalThis as { crypto?: unknown }).crypto) {
  (globalThis as { crypto?: unknown }).crypto = webcrypto;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Allow the Flutter app to call the API.
  app.enableCors();

  // Serve uploaded flyer images at /uploads/<file>.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // ---- Admin panel: server-rendered HBS views + session login ----
  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.setViewEngine('hbs');
  hbs.registerPartials(join(process.cwd(), 'views', 'partials'));
  hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dealplate-admin-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8h
    }),
  );

  // DTO validation (class-validator) + cast query/params to numbers.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

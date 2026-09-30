import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { static as serveStatic } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import {
  DEFAULT_API_PREFIX,
  DEFAULT_PORT,
} from './common/constants/app.constants';
import { getUploadRoot } from './files/file-storage.service';
import { fileStorageConfig } from './config/file-storage.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX ?? DEFAULT_API_PREFIX;

  app.setGlobalPrefix(apiPrefix);
  for (const folder of fileStorageConfig.publicFolders) {
    app.use(
      `${fileStorageConfig.publicUrlPrefix}${folder}`,
      serveStatic(join(getUploadRoot(), folder), {
        dotfiles: 'deny',
        index: false,
        setHeaders: (response) => {
          response.setHeader('X-Content-Type-Options', 'nosniff');
        },
      }),
    );
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Booking Tour API')
    .setDescription('Backend API for the tour booking system')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        bearerFormat: 'JWT',
        scheme: 'bearer',
        type: 'http',
      },
      'access-token',
    )
    .addTag('Authentication')
    .addTag('Tours')
    .addTag('Bookings')
    .addTag('Categories')
    .addTag('Reviews')
    .addTag('Administration')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
  });

  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();

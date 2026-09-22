import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  DEFAULT_API_PREFIX,
  DEFAULT_PORT,
} from './common/constants/app.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX ?? DEFAULT_API_PREFIX;

  app.setGlobalPrefix(apiPrefix);

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

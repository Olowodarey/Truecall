import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — allow frontend to call this API
  app.enableCors();

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger docs at /api/docs
  const config = new DocumentBuilder()
    .setTitle('TrueCall API')
    .setDescription('Backend API for the TrueCall prediction platform on Celo')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`TrueCall API running on http://localhost:${port}/api`);
  console.log(`Swagger docs:       http://localhost:${port}/api/docs`);
}

bootstrap();

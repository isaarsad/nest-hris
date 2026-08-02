import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { config } from './infrastructure/config/index.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const host = config.app.host;
  const port = config.app.port ?? 3000;

  await app.listen(port, host);

  const appUrl = await app.getUrl();

  logger.log(`HRIS Server running on: ${appUrl}`);
  logger.log(`Environment: ${process.env.NODE_ENV}`);
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start application', err);
  process.exit(1);
});

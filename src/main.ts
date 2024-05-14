import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PrismaService } from "./global-services/prisma.service";
import { ConfigService } from "@nestjs/config";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import compression from "@fastify/compress";
import { join } from "path";
import {SentryConfig} from "./common/sentry"
import * as Sentry from "@sentry/node"
// import { CustomLogger } from "./common/logger";
import { MonitoringService } from "./monitoring/monitoring.service";

async function bootstrap() {
  // const logger = new CustomLogger("Main");

  /** Fastify Application */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  /** Register Prismaservice LifeCycle hooks */
  const prismaService: PrismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  /** Global prefix: Will result in appending of keyword 'admin' at the start of all the request */
  const configService = app.get<ConfigService>(ConfigService);
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, "data:", "validator.swagger.io"],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  process.on('exit', (code)=>{
    console.log(`Process is exiting with code: ${code}`);
  })

  process.on('beforeExit', async () => {
    console.log("process exit...")
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal. Gracefully shutting down...');
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal. Gracefully shutting down...');
    const monitoringService = app.get<MonitoringService>(MonitoringService);
    await monitoringService.onExit();
    process.exit(0);
  });

  app.enableCors();
  await app.register(multipart);
  await app.register(compression, { encodings: ["gzip", "deflate"] });
  app.useStaticAssets({ root: join(__dirname, "../../files") });
  await app.listen(9000, "0.0.0.0");
  Sentry.init(SentryConfig)
}

bootstrap();

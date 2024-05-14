import { CacheModule, Module, ValidationPipe } from '@nestjs/common';
import { HttpModule, HttpService } from "@nestjs/axios";
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { PrismaService } from "./global-services/prisma.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MonitoringModule } from './monitoring/monitoring.module';
import { AiService } from './ai/ai.service';
import { MinioStorageService } from './mino/mino.service';
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import {LoggerService} from './logger/logger.service'


@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    AiModule,
    MonitoringModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: false
      }
    }),
    CacheModule.register()
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    ConfigService,
    AiService,
    MinioStorageService,
    LoggerService],
})
export class AppModule {}

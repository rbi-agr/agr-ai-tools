import { CacheModule, Module, ValidationPipe } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MinioStorageService } from 'src/mino/mino.service';
import { ConfigService } from "@nestjs/config";
import { PrismaService } from 'src/global-services/prisma.service';
import { LoggerService } from '../logger/logger.service'

@Module({
  imports: [CacheModule.register()],
  controllers: [AiController],
  providers: [
    ConfigService,
    PrismaService,
    AiService,
    MinioStorageService,
    LoggerService
  ]
})
export class AiModule {}

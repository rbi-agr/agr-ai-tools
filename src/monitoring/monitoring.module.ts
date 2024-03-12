// monitoring.module.ts
import { Module, OnModuleInit, Global, DynamicModule } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from 'src/global-services/prisma.service';

@Global()
@Module({
  providers: [MonitoringService,PrismaService],
  exports: [MonitoringService],
})
export class MonitoringModule implements OnModuleInit {
  constructor(private readonly monitoringService: MonitoringService) {}

  async onModuleInit() {
    await this.monitoringService.initializeAsync();
  }

  static forRoot(options?: any): DynamicModule {
    return {
      module: MonitoringModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
      ],
      exports: [MonitoringService],
    };
  }
}
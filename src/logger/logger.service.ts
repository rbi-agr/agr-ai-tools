import { Injectable } from '@nestjs/common';
import { createLogger, transports, format } from 'winston';

@Injectable()
export class LoggerService {
  private logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.errors({ stack: true }), format.splat(), format.json()),
    transports: [new transports.Console(), new transports.File({ filename: 'error.log', level: 'error' })],
  });

  info(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace: string) {
    this.logger.error(message, { trace });
  }
}
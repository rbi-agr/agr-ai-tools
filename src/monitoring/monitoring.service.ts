import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { PrismaService } from '../global-services/prisma.service';
import * as Sentry from '@sentry/node'
import {LoggerService} from "../logger/logger.service"

@Injectable()
export class MonitoringService {
  constructor(private prismaService: PrismaService, private readonly logger: LoggerService){}

  async initializeAsync(){
    const metricsToUpsert: any = [
      { name: 'languageDetectionFailureCount' },
      { name: 'translationFailureCount' },
      { name: 'neuralCoreferenceFailureCount' },
      { name: 'classifierFailureCount' },
      { name: 'wordSearchFailureCount' },
      { name: 'gptFailureCount' },
      { name: 'socketFailureCount' },
      { name: 'overallFailureCount' },
      { name: 'overallSuccessResponseCount' },
      { name: 'asrFailureCount' },
      { name: 'spellCheckFailureCount' },
    ];
    for (const metric of metricsToUpsert){
      const existingMetric: any = await this.prismaService.metrics.findUnique({
        where: { name: metric.name },
      });
      if(existingMetric){
        switch(existingMetric.name){
          case 'languageDetectionFailureCount':
            this.languageDetectionFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'translationFailureCount':
            this.translationFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'neuralCoreferenceFailureCount':
            this.neuralCoreferenceFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'classifierFailureCount':
            this.classifierFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'wordSearchFailureCount':
            this.wordSearchFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'gptFailureCount':
            this.gptFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'socketFailureCount':
            this.socketFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'overallFailureCount':
            this.overallFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'overallSuccessResponseCount':
            this.overallSuccessResponseCounter.inc(parseInt(existingMetric.value));
            break;
          case 'asrFailureCount':
            this.asrFailureCounter.inc(parseInt(existingMetric.value));
            break;
          case 'spellCheckFailureCount':
            this.spellCheckFailureCounter.inc(parseInt(existingMetric.value));
            break;
          default:
            break;
        }
      }
    }
  }

  public languageDetectionFailureCounter: Counter<string> = new Counter({
    name: 'languageDetectionFailureCount',
    help: 'Counts the API requests in Bhashini service',
  });
  public translationFailureCounter: Counter<string> = new Counter({
    name: 'translationFailureCount',
    help: 'Counts the successful API requests in Bhashini service',
  });
  public neuralCoreferenceFailureCounter: Counter<string> = new Counter({
    name: 'neuralCoreferenceFailureCount',
    help: 'Counts the failed API requests in Bhashini service',
  });

  public classifierFailureCounter: Counter<string> = new Counter({
    name: 'classifierFailureCount',
    help: 'Counts the API requests of /prompt API',
  });

  public wordSearchFailureCounter: Counter<string> = new Counter({
    name: 'wordSearchFailureCount',
    help: 'Counts the API requests of /prompt API',
  });

  public gptFailureCounter: Counter<string> = new Counter({
    name: 'gptFailureCount',
    help: 'Counts the API requests of /prompt API',
  });

  public socketFailureCounter: Counter<string> = new Counter({
    name: 'socketFailureCount',
    help: 'Counts the API requests of /prompt API',
  });

  public overallFailureCounter: Counter<string> = new Counter({
    name: 'overallFailureCount',
    help: 'Counts the API requests of /prompt API',
  });

  public overallSuccessResponseCounter: Counter<string> = new Counter({
    name: 'overallSuccessResponseCount',
    help: 'Counts the API requests of /prompt API',
  });

  public asrFailureCounter: Counter<string> = new Counter({
    name: 'asrFailureCount',
    help: 'Counts the API requests of /prompt API',
  })

  public spellCheckFailureCounter: Counter<string> = new Counter({
    name: 'spellCheckFailureCount',
    help: 'Counts the API requests of /prompt API',
  })

  public async getLanguageDetectionFailureCounter() {
    let count = await this.languageDetectionFailureCounter.get();
    return count.values[0].value;
  }

  public async getTranslationFailureCounter() {
    let count = await this.translationFailureCounter.get();
    return count.values[0].value;
  }

  public async getNeuralCoreferenceFailureCounter() {
    let count = await this.neuralCoreferenceFailureCounter.get();
    return count.values[0].value;
  }

  public async getClassifierFailureCounter() {
    let count = await this.classifierFailureCounter.get();
    return count.values[0].value;
  }

  public async getWordSearchFailureCounter() {
    let count = await this.wordSearchFailureCounter.get();
    return count.values[0].value;
  }

  public async getGptFailureCounter() {
    let count = await this.gptFailureCounter.get();
    return count.values[0].value;
  }

  public async getSocketFailureCounter() {
    let count = await this.socketFailureCounter.get();
    return count.values[0].value;
  }

  public async getOverallFailureCounter() {
    let count = await this.overallFailureCounter.get();
    return count.values[0].value;
  }

  public async getOverallSuccessResponseCounter() {
    let count = await this.overallSuccessResponseCounter.get();
    return count.values[0].value;
  }

  public async getAsrFailureCounter() {
    let count = await this.asrFailureCounter.get();
    return count.values[0].value;
  }

  public async getSpellCheckFailureCounter() {
    let count = await this.spellCheckFailureCounter.get();
    return count.values[0].value;
  }

  public incrementLanguageDetectionFailureCount(): void {
    this.languageDetectionFailureCounter.inc();
  }

  public incrementTranslationFailureCount(): void {
    this.translationFailureCounter.inc();
  }
  
  public incrementNeuralCoreferenceFailureCount(): void {
    this.neuralCoreferenceFailureCounter.inc();
  }

  public incrementClassifierFailureCount(): void {
    this.classifierFailureCounter.inc();
  }

  public incrementWordSearchFailureCount(): void {
    this.wordSearchFailureCounter.inc();
  }

  public incrementGptFailureCount(): void {
    this.gptFailureCounter.inc();
  }

  public incrementSocketFailureCount(): void {
    this.socketFailureCounter.inc();
  }

  public incrementOverallFailureCount(): void {
    this.overallFailureCounter.inc();
  }

  public incrementOverallSuccessResponseCount(): void {
    this.overallSuccessResponseCounter.inc();
  }

  public incrementAsrFailureCount(): void {
    this.asrFailureCounter.inc();
  }

  public incrementSpellCheckFailureCount(): void {
    this.spellCheckFailureCounter.inc();
  }

  public async onExit(): Promise<void> {
    const metricsToUpsert: any = [
      { name: 'languageDetectionFailureCount', value: `${await this.getLanguageDetectionFailureCounter()}`},
      { name: 'translationFailureCount', value: `${await this.getTranslationFailureCounter()}`},
      { name: 'neuralCoreferenceFailureCount', value: `${await this.getNeuralCoreferenceFailureCounter()}`},
      { name: 'classifierFailureCount', value: `${await this.getClassifierFailureCounter()}`},
      { name: 'wordSearchFailureCount', value: `${await this.getWordSearchFailureCounter()}`},
      { name: 'gptFailureCount', value: `${await this.getGptFailureCounter()}`},
      { name: 'socketFailureCount', value: `${await this.getSocketFailureCounter()}`},
      { name: 'overallFailureCount', value: `${await this.getOverallFailureCounter()}`},
      { name: 'overallSuccessResponseCount', value: `${await this.getOverallSuccessResponseCounter()}`},
      { name: 'asrFailureCount', value: `${await this.getAsrFailureCounter()}`},
      { name: 'spellCheckFailureCount', value: `${await this.getSpellCheckFailureCounter()}`},
    ];
    const upsertedMetrics = [];
    try{
      for (const metric of metricsToUpsert) {
        const existingMetric: any = await this.prismaService.metrics.findUnique({
          where: { name: metric.name },
        });
  
        if (existingMetric) {
          const updatedMetric = await this.prismaService.metrics.update({
            where: { id: existingMetric.id },
            data: { value: metric.value },
          });
          upsertedMetrics.push(updatedMetric);
        } else {
          const createdMetric = await this.prismaService.metrics.create({
            data: metric,
          });
          upsertedMetrics.push(createdMetric);
        }
      }
    } catch(err){
      Sentry.captureException("Monitoring Service Error:")
      this.logger.error("Monitoring Service Error:",err)
    }
  }

}

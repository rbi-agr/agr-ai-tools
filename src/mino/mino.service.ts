import { Injectable } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
var Minio = require('minio')

@Injectable()
export class MinioStorageService {
  private minioClient;

  constructor(
    private configService: ConfigService
  ) {
    try{
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get("MINO_BASE_URL"),
            port: 443,
            useSSL: true,
            accessKey:this.configService.get("MINO_ACCESS_KEY"),
            secretKey: this.configService.get("MINO_SECRET_KEY")
          });
    } catch(error){
        console.log(error)
    }
  }

  async uploadWavFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
    return await this.minioClient.putObject(bucketName, filename, file, file.length, { 'Content-Type': 'audio/wav' });
  }

  async uploadPdfFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
    return await this.minioClient.putObject(bucketName, filename, file, file.length, { 'Content-Type': 'application/pdf' });
  }

  async getDownloadURL(bucketName: string, filename: string) {
    return await this.minioClient.presignedUrl('GET', bucketName, filename)
  }
}
// import { Injectable } from '@nestjs/common';
// import { ConfigService } from "@nestjs/config";
var Minio = require('minio')

// @Injectable()
// export class MinioStorageService {
  // private minioClient;

//   constructor(
//     private configService: ConfigService
//   ) {
    // try{
    //     this.minioClient = new Minio.Client({
    //         endPoint: this.configService.get("MINO_BASE_URL"),
    //         port: 443,
    //         useSSL: true,
    //         accessKey:this.configService.get("MINO_ACCESS_KEY"),
    //         secretKey: this.configService.get("MINO_SECRET_KEY")
    //       });
    // } catch(error){
    //     console.log(error)
    // }
//   }

//   async uploadWavFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
//     return await this.minioClient.putObject(bucketName, filename, file, file.length, { 'Content-Type': 'audio/wav' });
//   }

//   async uploadPdfFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
//     return await this.minioClient.putObject(bucketName, filename, file, file.length, { 'Content-Type': 'application/pdf' });
//   }

//   async getDownloadURL(bucketName: string, filename: string) {
//     return await this.minioClient.presignedUrl('GET', bucketName, filename)
//   }
// }



import { Injectable } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

  async uploadFile(bucketName: string, filename: string, file: Buffer, contentType: string): Promise<void> {
    const MINIO_BASE_URL = this.configService.get("MINO_BASE_URL");
    const MINIO_ACCESS_KEY = this.configService.get("MINO_ACCESS_KEY");
    const MINIO_SECRET_KEY = this.configService.get("MINO_SECRET_KEY");

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Generate a unique temporary file name
    const tempFilename = uuidv4() + path.extname(filename);
    const tempFilePath = path.join(tempDir, tempFilename);
    
    // Write the buffer to the temporary file
    fs.writeFileSync(tempFilePath, file);

    // Construct the curl command
    const curlCommand = `curl -k -X PUT "${MINIO_BASE_URL}/${bucketName}/${filename}" \
      -H "Content-Type: ${contentType}" \
      -H "Authorization: Basic $(echo -n '${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}' | base64)" \
      --data-binary @${tempFilePath}`;

    // Execute the curl command
    exec(curlCommand, (error, stdout, stderr) => {
      // Handle errors or log success
      if (error) {
        console.error(`Error: ${error.message}`);
      } else if (stderr) {
        console.error(`stderr: ${stderr}`);
      } else {
        console.log(`stdout: ${stdout}`);
      }

      // Remove the temporary file
      fs.unlinkSync(tempFilePath);
    });
  }

  async uploadWavFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
    await this.uploadFile(bucketName, filename, file, 'audio/wav');
  }

  async uploadPdfFile(bucketName: string, filename: string, file: Buffer): Promise<void> {
    await this.uploadFile(bucketName, filename, file, 'application/pdf');
  }

  // async getDownloadURL(bucketName: string, filename: string) {
  //   const MINIO_BASE_URL = this.configService.get("MINO_BASE_URL");
  //   return `${MINIO_BASE_URL}/${bucketName}/${filename}`;
  // }

  async getDownloadURL(bucketName: string, filename: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const url = this.configService.get("MINO_BASE_URL");
        const accessKey = this.configService.get("MINO_ACCESS_KEY")
        const secretKey = this.configService.get("MINO_SECRET_KEY")
        const scriptPath = 'src/ai/scripts/minio.sh';
        const command = `${scriptPath} "${url}" "${accessKey}" "${secretKey}" "${bucketName}" "${filename}"`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error('Error executing shell script:', error);
            reject(error);
          } else if (stderr) {
            console.error('Error in shell script:', stderr);
            reject(stderr);
          } else {
            const url = stdout.trim();
            resolve(url);
          }
        });
      });
    }
}

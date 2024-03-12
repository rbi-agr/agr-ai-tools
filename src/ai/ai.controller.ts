import { Body, Controller, Post, UseInterceptors, UploadedFile, UnsupportedMediaTypeException, Headers, Inject, CACHE_MANAGER, UseGuards, Request, Query} from "@nestjs/common";
import { diskStorage } from 'multer';
import { FastifyFileInterceptor } from "../interceptors/file.interceptor";
import { extname } from 'path';
import { Request as ExpressRequest } from 'express';
import { ConfigService } from "@nestjs/config";
import { DetectLang, T2S } from "./ai.dto"
import { AiService } from "./ai.service";
import { PrismaService } from "src/global-services/prisma.service";
import { Cache } from 'cache-manager';

const editFileName = (req: ExpressRequest, file: Express.Multer.File, callback) => {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};

export const imageFileFilter = (
  req: ExpressRequest,
  file: Express.Multer.File,
  callback,
) => {
  console.log("IMage filter...")
  if (!file.originalname.match(/\.(wav)$/)) {
    return callback(new UnsupportedMediaTypeException('Only wav files are allowed!'), false);
  }
  callback(null, true);
};



@Controller('ai')
export class AiController {
    constructor(
      private configService: ConfigService, 
      private aiToolsService: AiService, 
      private prismaService: PrismaService,
      @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {
        this.aiToolsService = new AiService(configService, prismaService, cacheManager)
    }
    @Post('t2s')
    async t2s(@Body() body: T2S){
      return await this.aiToolsService.t2s(body.text)
    }

    @Post('detectLanguage') 
    async detectLanguage(@Body() body:DetectLang) {
      return await this.aiToolsService.detectLanguage(body.text);
    }

    @Post('translate')
    async translate(@Body() body: any,  @Request() request){
      let translateService;
      if(!body.provider) {
        translateService = "bhashini"
      } else {
        translateService = body.provider
      }
      if(translateService=="azure")
      return await this.aiToolsService.translate(body.source,body.target,body.text)
      else
      return await this.aiToolsService.translateBhashini(body.source,body.target,body.text)
    }


  @Post('asr')
  @UseInterceptors(
    FastifyFileInterceptor('file', {
        storage: diskStorage({
            destination: './files',
            filename: editFileName,
        }),
        fileFilter: imageFileFilter,
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body,
    @Query('language') language: string,
  ) {
    return await this.aiToolsService.asr(file, { ...body }, language);
  }

}

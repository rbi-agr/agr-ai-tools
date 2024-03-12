import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioStorageService } from 'src/mino/mino.service';
import { Language } from 'src/language';
import { convertWavToBase64Async } from 'src/common/utils';
import fetch  from 'src/common/fetch';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { isMostlyEnglish } from 'src/utils';
import { PrismaService } from '../global-services/prisma.service';
import { unlink } from 'fs/promises';
import { Cache } from 'cache-manager';
const FormData = require("form-data");

const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { v4: uuidv4 } = require('uuid');

let languageType: Language;
@Injectable()
export class AiService {

    private minioStorageService: MinioStorageService;
    constructor(
      private configService: ConfigService, 
      private prismaService: PrismaService,
      @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {
        this.minioStorageService = new MinioStorageService(configService);
    }

    async detectLanguage(text: string): Promise<any> {
      var myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
  
      var body = JSON.stringify({
        modelId: this.configService.get("TEXT_LANG_DETECTION_MODEL"),
        task: "txt-lang-detection",
        input:[{
          source: text?.replace("?","")?.trim()
        }],
        userId: null
      });
  
      var requestOptions = {
        method: "POST",
        headers: myHeaders,
        body
      };
  
      try {
          // this.monitoringService.incrementBhashiniCount()
          let response:any = await fetch(
              'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute',
              requestOptions
          )
          response = await response.json()
          let language: Language;
          if(response.output && response.output.length){
            language = response.output[0]?.langPrediction[0]?.langCode as Language
            // this.monitoringService.incrementBhashiniSuccessCount()
            return {
              language: language || 'unk',
              error: null
            }
          } else {
            // this.monitoringService.incrementBhashiniFailureCount()
            return {
              language: 'unk',
              error: null
            }
          }
      } catch (error) {
          // this.monitoringService.incrementBhashiniFailureCount()
          if(isMostlyEnglish(text?.replace("?","")?.trim())) {
              return {
                  language: Language.en,
                  error: error.message
              }
          } else {
              return {
                  language: 'unk',
                  error: error.message
              }
          }
      }
    }

    async convertCodecAsync(inputFilePath, outputFileName): Promise<any> {
        return new Promise((resolve, reject) => {
          ffmpeg()
            .input(inputFilePath)
            .audioCodec('pcm_s16le')
            .output(outputFileName)
            .on('end', () => {
              resolve('Conversion finished');
            })
            .on('error', (err) => {
              console.error('Error:', err);
              reject(err);
            })
            .run();
        });
      }

    async getBhashiniConfig(task, config) {
    // const cacheKey = `getBhashiniConfig:${JSON.stringify({ task, config })}`;

    // const cachedData = await this.cacheManager.get(cacheKey);
    // if (cachedData) {
    //   return cachedData;
    // }
        var myHeaders = new Headers();
        myHeaders.append("userID", this.configService.get("ULCA_USER_ID"));
        myHeaders.append("ulcaApiKey", this.configService.get("ULCA_API_KEY"));
        myHeaders.append("Content-Type", "application/json");

        var raw = JSON.stringify({
            "pipelineTasks": [
            {
                "taskType": task,
                "config": config
            }
            ],
            "pipelineRequestConfig": {
            "pipelineId": "64392f96daac500b55c543cd"
            }
        });

        var requestOptions: any = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow',
            retry: 4,
            pause: 0,
            callback: retry => {
            console.log(`Re-Trying: ${retry}`);
            },
            timeout: 40000
        };
        try {
            // this.monitoringService.incrementBhashiniCount()
            console.log(`${new Date()}: Waiting for ${this.configService.get("ULCA_CONFIG_URL")} (config API) to respond ...`)
            let response = await fetch(this.configService.get("ULCA_CONFIG_URL"), requestOptions)
            if (response.status != 200) {
            console.log(response)
            throw new Error(`${new Date()}: API call to '${this.configService.get("ULCA_CONFIG_URL")}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${response.status}`)
            }
            response = await response.json()
            console.log(`${new Date()}: Responded succesfully`)
            // this.monitoringService.incrementBhashiniSuccessCount()
            // await this.cacheManager.set(cacheKey, response, 86400);
            return response
        } catch (error) {
            // this.monitoringService.incrementBhashiniFailureCount()
            console.log(error);
            return {
            error
            }
        }
    } 

    async computeBhashini(authorization, task, serviceId, url, config, input) {
        // const cacheKey = `computeBhashini:${JSON.stringify({ task, serviceId, url, config, input })}`;
        // if(task != 'asr'){
        //   const cachedData = await this.cacheManager.get(cacheKey);
        //   if (cachedData) {
        //     return cachedData;
        //   }
        // }
        var myHeaders = new Headers();
        myHeaders.append("Accept", " */*");
        myHeaders.append("Authorization", authorization);
        myHeaders.append("Content-Type", "application/json");
        config['serviceId'] = serviceId
        if (task == 'tts') {
            config['gender'] = 'male'
            config['samplingRate'] = 8000
        }
        var raw = JSON.stringify({
            "pipelineTasks": [
            {
                "taskType": task,
                "config": config
            }
            ],
            "inputData": input
        });

        var requestOptions: any = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow',
            retry: 4,
            pause: 0,
            callback: retry => {
            console.log(`Re-Trying: ${retry}`);
            },
            timeout: 40000
        };

        try {
            // this.monitoringService.incrementBhashiniCount()
            console.log(`${new Date()}: Waiting for ${url} for task (${task}) to respond ...`)
            let response = await fetch(url, requestOptions)
            if (response.status != 200) {
            console.log(response)
            throw new Error(`${new Date()}: API call to '${url}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${response.status}`)
            }
            response = await response.json()
            console.log(`${new Date()}: Responded succesfully.`)
            // this.monitoringService.incrementBhashiniSuccessCount()
            // if(task != 'asr') {
            //   await this.cacheManager.set(cacheKey, response, 7200);
            // }
            return response
        } catch (error) {
            // this.monitoringService.incrementBhashiniFailureCount()
            console.log(error);
            return {
            error
            }
        }
    }

      async speechToText(
        base64audio: string,
        language: Language,
        postProcessors: Boolean = true
      ) {
        try {
          let config: any = await this.getBhashiniConfig('asr', {
            "language": {
              "sourceLanguage": language
            }
          })
          let asrConfig = {
            "language": {
              "sourceLanguage": language
            }
          };
          if(postProcessors) asrConfig["postProcessors"]=["itn"]
          let response: any = await this.computeBhashini(
            config?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
            "asr",
            config?.pipelineResponseConfig[0].config[0].serviceId,
            config?.pipelineInferenceAPIEndPoint?.callbackUrl,
            asrConfig,
            {
              "audio": [
                {
                  "audioContent": base64audio
                }
              ]
            }
          )
          if (response["error"]) {
            console.log(response["error"])
            throw new Error(response["error"])
          }
          return {
            text: response?.pipelineResponse[0]?.output[0]?.source,
            error: null
          }
        } catch (error) {
          console.log(error)
          return {
            text: "",
            error: error
          }
        }
      }
    
    async azureASR(filePath: string, body: any): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const speechConfig = sdk.SpeechConfig.fromSubscription(this.configService.get("SPEECH_KEY"), this.configService.get("SPEECH_REGION"));
            speechConfig.speechRecognitionLanguage = body.language == "hi" ? "hi-IN" : "en-US";

            let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
            let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

            speechRecognizer.recognizeOnceAsync((result) => {
            switch (result.reason) {
                case sdk.ResultReason.RecognizedSpeech:
                console.log(`RECOGNIZED: Text=${result.text}`);
                resolve(result.text);
                break;
                case sdk.ResultReason.NoMatch:
                console.log('NOMATCH: Speech could not be recognized.');
                reject(new Error('Speech could not be recognized'));
                break;
                case sdk.ResultReason.Canceled:
                const cancellation = sdk.CancellationDetails.fromResult(result);
                console.log(`CANCELED: Reason=${cancellation.reason}`);
                reject(new Error('Recognition canceled'));

                if (cancellation.reason === sdk.CancellationReason.Error) {
                    console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                    console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                    console.log(
                    'CANCELED: Did you set the speech resource key and region values?',
                    );
                }
                break;
            }
            speechRecognizer.close();
            });
        });
    }

    // async asr(file: Express.Multer.File, language: string): Promise<any> {
    //   console.log("Started asr...")
    //     let startTime = Date.now();
    //     let inputFilePath = path.join(__dirname, `../../../${file.path}`);
    //     const outputFileName = `./files/${file.filename}_modified.wav`;
    //     let filePath = path.join(__dirname, `../../../${outputFileName}`);
    //     let postProcessors = true
    //     // if(body.disablePostProcessor=="true") postProcessors = false
    //     // const command = `ffmpeg -i '${inputFilePath}' -acodec pcm_s16le '${outputFileName}'`;
    //     let downloadURL, response: any, res: any, timeTaken, spellCheckTimeTaken;
    //     try {
    //       // await exec(command);
    //       await this.convertCodecAsync(inputFilePath,outputFileName);
    //       console.log(`File '${inputFilePath}' converted to '${outputFileName}' successfully.`);
    //     } catch (error) {
    //       filePath = inputFilePath
    //       console.log(error)
    //     }
    
    //     try {
    //       let asrService = "azure"
    //       //azure
    //       if (asrService == "azure")
    //         response = await this.azureASR(filePath, { language });
    //       else {
    //         // bhashini
    //         var formdata = new FormData();
    //         formdata.append('file', fs.createReadStream(filePath));
    //         let base64String = await convertWavToBase64Async(filePath);
    //         if (language.toLowerCase() === 'en') {
    //           languageType = Language.en;
    //         } else {
    //           languageType = Language.hi;
    //         }
    //         response = await this.speechToText(base64String, languageType, postProcessors);
    //         response = await response.text
    //       }
    
    //       timeTaken = `${(Date.now() - startTime) / 1000} sec`;
    //       let spellCheckstartTime = Date.now();
    //       spellCheckTimeTaken = `${(Date.now() - spellCheckstartTime) / 1000} sec`
    //       const fileBuffer = await fsPromises.readFile(filePath);
    //       console.log("amakrushi-audio", file.filename, file.buffer)
    //       let error;
    //       try {
    //         await this.minioStorageService.uploadWavFile("amakrushi-audio", file.filename, fileBuffer);
    //         downloadURL = await this.minioStorageService.getDownloadURL("amakrushi-audio", file.filename)
    //       } catch (err) {
    //         console.log(err)
    //         error = err
    //         downloadURL = "Error occured while uploading this audio."
    //       }
    //       if (!error && response == "ପୁଣିଥରେ ଚେଷ୍ଟା କରନ୍ତୁ") error = `AI Tools responeded with "ପୁଣିଥରେ ଚେଷ୍ଟା କରନ୍ତୁ"`
    //       let asr = await this.prismaService.speech_to_text.create({
    //         data: {
    //           audio: downloadURL,
    //           text: response,
    //           spell_corrected_text: response,
    //           timeTaken,
    //           spellCheckTimeTaken,
    //           error: `${error}`,
    //           phoneNumber: ""
    //         }
    //       })
    //       try {
    //         await unlink(filePath)
    //         await unlink(inputFilePath)
    //       } catch (error) {
    //         console.log(error)
    //       }
    //       return {
    //         id: asr.id,
    //         text: asr.text
    //       }
    //     } catch (err) {
    //       console.log('error', err)
    //       await this.prismaService.speech_to_text.create({
    //         data: {
    //           audio: downloadURL ? downloadURL : "Error occured while uploading this audio.",
    //           text: response ? response : "Error occured while uploading this audio.",
    //           spell_corrected_text: response ? response : "Error occured while uploading this audio.",
    //           timeTaken,
    //           spellCheckTimeTaken,
    //           error: `${err}`,
    //           phoneNumber: ""
    //         }
    //       })
    //     }
    //   }

    async asr(file: Express.Multer.File, body: any, language: string): Promise<any> {
      let startTime = Date.now();
      let inputFilePath = path.join(__dirname, `../../${file.path}`);
      const outputFileName = `./files/${file.filename}_modified.wav`;
      let filePath = path.join(__dirname, `../../${outputFileName}`);
      let postProcessors = true
      // if(body.disablePostProcessor=="true") postProcessors = false
      // const command = `ffmpeg -i '${inputFilePath}' -acodec pcm_s16le '${outputFileName}'`;
      let downloadURL, response: any, res: any, timeTaken, spellCheckTimeTaken;
      try {
        // await exec(command);
        await this.convertCodecAsync(inputFilePath,outputFileName);
        console.log(`File '${inputFilePath}' converted to '${outputFileName}' successfully.`);
      } catch (error) {
        filePath = inputFilePath
        console.log(error)
      }
  
      try {
  
        let asrService = "azure"
        //azure
        if (asrService == "azure")
          response = await this.azureASR(filePath, { language });
        else {
          // bhashini
          var formdata = new FormData();
          formdata.append('file', fs.createReadStream(filePath));
          let base64String = await convertWavToBase64Async(filePath);
          if (language.toLowerCase() === 'en') {
            languageType = Language.en;
          } else {
            languageType = Language.hi;
          }
          response = await this.speechToText(base64String, languageType, postProcessors);
          response = await response.text
        }
  
        timeTaken = `${(Date.now() - startTime) / 1000} sec`;
        let spellCheckstartTime = Date.now();
        spellCheckTimeTaken = `${(Date.now() - spellCheckstartTime) / 1000} sec`
        const fileBuffer = await fsPromises.readFile(filePath);
        console.log("amakrushi-audio", file.filename, file.buffer)
        let error;
        try {
          await this.minioStorageService.uploadWavFile("amakrushi-audio", file.filename, fileBuffer);
          downloadURL = await this.minioStorageService.getDownloadURL("amakrushi-audio", file.filename)
        } catch (err) {
          console.log(err)
          error = err
          downloadURL = "Error occured while uploading this audio."
        }
        if (!error && response == "ପୁଣିଥରେ ଚେଷ୍ଟା କରନ୍ତୁ") error = `AI Tools responeded with "ପୁଣିଥରେ ଚେଷ୍ଟା କରନ୍ତୁ"`
        let asr = await this.prismaService.speech_to_text.create({
          data: {
            audio: downloadURL,
            text: response,
            spell_corrected_text: response,
            timeTaken,
            spellCheckTimeTaken,
            error: `${error}`,
            phoneNumber: ""
          }
        })
        try {
          await unlink(filePath)
          await unlink(inputFilePath)
        } catch (error) {
          console.log(error)
        }
        return {
          id: asr.id,
          text: asr.text
        }
      } catch (err) {
        console.log('error', err)
        await this.prismaService.speech_to_text.create({
          data: {
            audio: downloadURL ? downloadURL : "Error occured while uploading this audio.",
            text: response ? response : "Error occured while uploading this audio.",
            spell_corrected_text: response ? response : "Error occured while uploading this audio.",
            timeTaken,
            spellCheckTimeTaken,
            error: `${err}`,
            phoneNumber: ""
          }
        })
      }
    }

      async t2s(text: string) {
        try {
          text = text.replace('|', '')
          let finalResponse;
          let languageDetected = await this.detectLanguage(text)
          console.log(languageDetected)
          if(languageDetected.language == "unk") {
            throw new Error("This language is not supported!");
          }  else {
            languageDetected = languageDetected.language;
          }
          let config = {
            "language": {
              "sourceLanguage": languageDetected
            }
          }
          let task = 'tts'
          let cacheKey = `getBhashiniConfig:${JSON.stringify({ task, config })}`;
          let cachedData = await this.cacheManager.get(cacheKey);
          var myHeaders = new Headers();
          myHeaders.append("userID", this.configService.get("ULCA_USER_ID"));
          myHeaders.append("ulcaApiKey", this.configService.get("ULCA_API_KEY"));
          myHeaders.append("Content-Type", "application/json");
          let configResponse;
          if (cachedData) {
            configResponse = cachedData;
          } else {
            var raw = JSON.stringify({
              "pipelineTasks": [
                {
                  "taskType": task,
                  "config": config
                }
              ],
              "pipelineRequestConfig": {
                "pipelineId": "64392f96daac500b55c543cd"
              }
            });
            var requestOptions: any = {
              method: 'POST',
              headers: myHeaders,
              body: raw,
              redirect: 'follow',
              retry: 4,
              pause: 0,
              callback: retry => {
                console.log(`Re-Trying: ${retry}`);
              },
              timeout: 40000
            };
            console.log(this.configService.get("ULCA_CONFIG_URL"))
            let response: any = await fetch(this.configService.get("ULCA_CONFIG_URL"), requestOptions)
            if (response.status != 200) {
              console.log(response)
              throw new Error(`${new Date()}: API call to '${this.configService.get("ULCA_CONFIG_URL")}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${response.status}`)
            }
            response = await response.json()
            console.log(response);
            await this.cacheManager.set(cacheKey, response, 86400);
            configResponse = response
          }
          if (configResponse) {
            let authorization = configResponse?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value;
            let serviceId = configResponse?.pipelineResponseConfig[0].config[0].serviceId;
            let url = configResponse?.pipelineInferenceAPIEndPoint?.callbackUrl;
            cacheKey = `computeBhashini:${JSON.stringify({ task, serviceId, url, config, text })}`;
            cachedData = null;
            cachedData = await this.cacheManager.get(cacheKey);
            if (cachedData) {
              finalResponse = {
                text: cachedData?.pipelineResponse[0]?.audio[0]?.audioContent,
                error: null
              }
            } else {
              myHeaders.append("Authorization", authorization);
              config['serviceId'] = serviceId
              config['gender'] = 'male'
              config['samplingRate'] = 8000
              raw = JSON.stringify({
                "pipelineTasks": [
                  {
                    "taskType": task,
                    "config": config
                  }
                ],
                "inputData": {
                  "input": [
                    {
                      "source": text
                    }
                  ]
                }
              });
              let requestOptions: any = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow',
                retry: 4,
                pause: 0,
                callback: retry => {
                  console.log(`Re-Trying: ${retry}`);
                },
                timeout: 40000
              };
              console.log(url)
              let response: any = await fetch(url, requestOptions)
              console.log("Hereeee ", response)
              if (response.status != 200) {
                console.log(response)
                throw new Error(`${new Date()}: API call to '${url}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${response.status}`)
              }
              response = await response.json();
              if (response["error"]) {
                console.log(response["error"])
                throw new Error(response["error"])
              }
              await this.cacheManager.set(cacheKey, response, 7200);
              finalResponse = {
                text: response?.pipelineResponse[0]?.audio[0]?.audioContent,
                error: null
              }
              console.log("Final Response: ", finalResponse)
            }
          } else {
            throw new Error('Something went wrong, please try again')
          }
          if (finalResponse && finalResponse.text) {
            const binaryData = Buffer.from(finalResponse.text, 'base64');
            const uuid = uuidv4();
            await this.minioStorageService.uploadWavFile("amakrushi-audio", `${uuid}.wav`, binaryData);
            console.log("Uploaded the audio file...")
            return await this.minioStorageService.getDownloadURL("amakrushi-audio", `${uuid}.wav`)
          } else {
            throw new Error('Something went wrong, please try again')
          }
        } catch (error) {
          console.log(error);
          return {
            error
          }
        }
      }

      async translate(
        source: Language,
        target: Language,
        text: string
      ): Promise<any> {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append(
          "Authorization",
          this.configService.get("AI_TOOLS_AUTH_HEADER")
        );
    
        let textArray = text.replace(/\n\n/g, "\n").split("\n")
        try {
          for (let i = 0; i < textArray.length; i++) {
            var raw = JSON.stringify({
              source_language: source,
              target_language: target,
              text: textArray[i],
            });
            var requestOptions: any = {
              method: "POST",
              headers: myHeaders,
              body: raw.replace('"unk\"', '"hi\"'),
            };
            let translateURL = 'text_translation/azure_dict/remote/';
            translateURL = `${this.configService.get("AI_TOOLS_BASE_URL")}/${translateURL}`
    
            let response = await fetch(
              translateURL,
              requestOptions
            )
            response = await response.json()
            if (response["error"]) {
              console.log(response["error"])
              throw new Error(response["error"])
            }
            textArray[i] = response["translated"] as string ? response["translated"] as string : "";
          }
          return {
            translated: textArray.join('\n'),
            error: null
          }
        } catch (error) {
          return {
            translated: "",
            error: error.message
          }
        }
      }

      async translateBhashini(
        source: Language,
        target: Language,
        text: string
      ) {
        try {
          let config = {
            "language": {
              "sourceLanguage": source,
              "targetLanguage": target
            }
          }
          let bhashiniConfig: any = await this.getBhashiniConfig('translation', config)
    
          let textArray = text.replace(/\n\n/g, "\n").split("\n")
          for (let i = 0; i < textArray.length; i++) {
            let response: any = await this.computeBhashini(
              bhashiniConfig?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
              "translation",
              bhashiniConfig?.pipelineResponseConfig[0].config[0].serviceId,
              bhashiniConfig?.pipelineInferenceAPIEndPoint?.callbackUrl,
              config,
              {
                "input": [
                  {
                    "source": textArray[i]
                  }
                ]
              }
            )
            if (response["error"]) {
              console.log(response["error"])
              throw new Error(response["error"])
            }
            textArray[i] = response?.pipelineResponse[0]?.output[0]?.target
          }
          return {
            translated: textArray.join('\n'),
            error: null
          }
        } catch (error) {
          console.log(error)
          return {
            translated: "",
            error: error
          }
        }
      }

}

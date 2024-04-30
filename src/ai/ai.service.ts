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
import { exec } from 'child_process';
import { promisify } from 'util';
const FormData = require("form-data");

const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { v4: uuidv4 } = require('uuid');
const execPromise = promisify(exec);

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
          try {
              const scriptPath = 'src/ai/scripts/detectLanguage.sh'; // Path to your script file
              const command = `${scriptPath} "${text?.replace("?", "")?.trim()}" "${this.configService.get("TEXT_LANG_DETECTION_MODEL")}"`; // Command to execute the script with text parameter
              const parameters = [
                text?.replace("?", "")?.trim(),
                this.configService.get("TEXT_LANG_DETECTION_MODEL")
            ];
              const { stdout, stderr } = await execPromise(command);
  
              const response = JSON.parse(stdout);
              console.log('Response from Bhasini:', response)

              if(response.error) {
                console.log("Error:", response);
                throw new Error(response.error);
              }
              
              let language: Language;
              if (response.output && response.output.length) {
                  language = response.output[0]?.langPrediction[0]?.langCode as Language;
              }
  
              return {
                  language: language || 'unk',
                  error: null
              };
          } catch (error) {
              if (isMostlyEnglish(text?.replace("?", "")?.trim())) {
                  return {
                      language: Language.en,
                      error: error.message
                  };
              } else {
                  return {
                      language: 'unk',
                      error: error.message
                  };
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

    async asr(file: Express.Multer.File, body: any, language: string): Promise<any> {
      let startTime = Date.now();
      let inputFilePath = path.join(__dirname, `../../${file.path}`);
      const outputFileName = `./files/${file.filename}_modified.wav`;
      let filePath = path.join(__dirname, `../../${outputFileName}`);
      let postProcessors = true
      const asrService = body.provider ? body.provider : "bhasini";
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
        console.log("AGR-audio", file.filename, file.buffer)
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
          // var myHeaders = new Headers();
          // myHeaders.append("userID", this.configService.get("ULCA_USER_ID"));
          // myHeaders.append("ulcaApiKey", this.configService.get("ULCA_API_KEY"));
          // myHeaders.append("Content-Type", "application/json");
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

            console.log(this.configService.get("ULCA_CONFIG_URL"))
            let response = await this.getBhashiniConfig(task, config);

            if (response.status) {
              console.log(response)
              throw new Error(`${new Date()}: API call to '${this.configService.get("ULCA_CONFIG_URL")}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${response.status}`)
            }
            // console.log(response);
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
              config['serviceId'] = serviceId
              config['gender'] = 'male'
              config['samplingRate'] = 8000

              let raw = {
                "pipelineTasks": [
                  {
                    "taskType": task,
                    "config": config
                  }
                ],
                "input": [
                  {
                    "source": text
                  }
                ]
              }

              let responseBhasini = await this.computeBhashini(
                authorization,
                task,
                serviceId,
                url,
                config,
                {
                  "input": [
                    {
                      "source": text
                    }
                  ]
                }
              )
              // myHeaders.append("Authorization", authorization);
              // config['serviceId'] = serviceId
              // config['gender'] = 'male'
              // config['samplingRate'] = 8000
              // raw = JSON.stringify({
              //   "pipelineTasks": [
              //     {
              //       "taskType": task,
              //       "config": config
              //     }
              //   ],
              //   "input": [
              //     {
              //       "source": text
              //     }
              //   ]
              // });
              // let requestOptions: any = {
              //   method: 'POST',
              //   headers: myHeaders,
              //   body: raw,
              //   redirect: 'follow',
              //   retry: 4,
              //   pause: 0,
              //   callback: retry => {
              //     console.log(`Re-Trying: ${retry}`);
              //   },
              //   timeout: 40000
              // };
              console.log(url)
              // let response: any = await fetch(url, requestOptions)
              
              // console.log("Hereeee ", responseBhasini)
              if (responseBhasini.status) {
                console.log(responseBhasini)
                throw new Error(`${new Date()}: API call to '${url}' with config '${JSON.stringify(raw, null, 3)}' failed with status code ${responseBhasini.status}`)
              }

              if (responseBhasini["error"]) {
                console.log(responseBhasini["error"])
                throw new Error(responseBhasini["error"])
              }
              await this.cacheManager.set(cacheKey, responseBhasini, 7200);
              finalResponse = {
                text: responseBhasini?.pipelineResponse[0]?.audio[0]?.audioContent,
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
            let up = await this.minioStorageService.uploadWavFile("amakrushi-audio", `${uuid}.wav`, binaryData);
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

      async translateBhashini(
        source: Language,
        target: Language,
        text: string
    ): Promise<any> {
        try {
          let config = {
            "language": {
            "sourceLanguage": source,
            "targetLanguage": target
          }
        }
        const bhashiniConfig = await this.getBhashiniConfig('translation', config);

        let textArray = text.replace(/\n\n/g, "\n").split("\n")

        for (let i = 0; i < textArray.length; i++) {
          let response = await this.computeBhashini(
            bhashiniConfig?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value,
            'translation',
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

          console.log('Response from computeBhashiniConfig:', response?.pipelineResponse[0])

          if(response.error) {
            console.log("Error:", response.error);
            throw new Error(response.error);
          }

          textArray[i] = response?.pipelineResponse[0]?.output[0]?.target
        }
        console.log("Response:", textArray.join('\n'));
        return {
          translated: textArray.join('\n'),
          error: null
        }
      } catch (error) {
        console.error(error);
        return {
          translated: "",
          error: error
        };
      }
    }

  async getBhashiniConfig(task, config) {
    const userID = this.configService.get("ULCA_USER_ID");
    const ulcaApiKey = this.configService.get("ULCA_API_KEY");
    const apiURL = this.configService.get("ULCA_CONFIG_URL");

    const scriptPath = 'src/ai/scripts/getBhashiniConfig.sh';

    console.log(`${new Date()}: Waiting for ${apiURL} (config API) to respond ...`);

    try {
        const command = `${scriptPath} ${userID} ${ulcaApiKey} ${apiURL} ${task} '${JSON.stringify(config)}'`;
        const { stdout, stderr } = await execPromise(command);

        const response = JSON.parse(stdout);
        console.log('Response from getBhasiniConfig:', response)

        if(response.message) {
          console.log("Error:", response);
          throw new Error(response.message);
        }

        console.log(`${new Date()}: Responded successfully`);
        return response;
    } catch (error) {
        console.error(`${new Date()}: Error executing script: ${error}`);
        return { error };
    }
}

  async computeBhashini(authorization, task, serviceId, url, config, input) {
    try {
        const scriptPath = 'src/ai/scripts/computeBhashini.sh';

        const configStr = JSON.stringify(config).replace(/"/g, '\\"');
        const inputDataStr = JSON.stringify(input).replace(/"/g, '\\"');
        const command = `${scriptPath} "${authorization}" "${task}" "${serviceId}" "${url}" "${configStr}" "${inputDataStr}"`;

        const { stdout, stderr } = await execPromise(command);
        const response = JSON.parse(stdout);

        if(response.error) {
          console.log("Error:", response.error);
          throw new Error(response.error);
        }

        return response;
      } catch (error) {
        console.error(`Error in computeBhashini function: ${error.message}`);
        throw new Error(error.message);
      }
    }
  }








            
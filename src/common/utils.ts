// import { AI_TOOLS_DELAY_ALERT, AI_TOOLS_ERROR } from "./constants";
import fetch from "node-fetch";
import * as Sentry from '@sentry/node'
const fs = require('fs');

export const fetchWithAlert = async (
    url: string, 
    options?: any, 
    alertResponseTime: number = parseInt(process.env.DEFAULT_ALERT_RESPONSE_TIME) || 15000 
): Promise<any> => {
    try {
        const start = Date.now();
        const response = await fetch(url, options);
        if(response.status && !response.ok){
            Sentry.captureException(`Fetch With Alert Error: Network response was not ok. status ${response.status}`)
            throw new Error(`Network response was not ok. status ${response.status}`);
        }
        const end = Date.now();
        const responseTime = end - start;
        // if (responseTime > alertResponseTime) {
        //     // sendEmail(
        //     //     JSON.parse(process.env.SENDGRID_ALERT_RECEIVERS),
        //     //     "Delay in Ai-tools response",
        //     //     AI_TOOLS_DELAY_ALERT(
        //     //         responseTime,
        //     //         url,
        //     //         options
        //     //     )
        //     // )
        //     sendDiscordAlert(
        //         "Delay in Ai-tools response",
        //         AI_TOOLS_DELAY_ALERT(
        //             responseTime,
        //             url,
        //             options
        //         ),
        //         16711680
        //     )
        // }
        return response;
    } catch(error){
        Sentry.captureException("Fetch With Alert Error")
        // sendEmail(
        //     JSON.parse(process.env.SENDGRID_ALERT_RECEIVERS),
        //     "Ai-tools request failure",
        //     AI_TOOLS_ERROR(
        //         url,
        //         options,
        //         error
        //     )
        // )
        // sendDiscordAlert(
        //     "Ai-tools request failure",
        //     AI_TOOLS_ERROR(
        //         url,
        //         options,
        //         error
        //     ),
        //     16711680
        // )
        console.log("ERROR: ", error);
    }
}

export const getErrorRate = (startTimestamp,levels=[{time:45000,error:10},{time:25000,error:5}])=> {
    let timeTakenInMilliSeconds = new Date().getTime() - startTimestamp;
    for(let i=0; i<levels.length; i++){
        if(timeTakenInMilliSeconds>=levels[i].time){
            return levels[i].error
        }
    }
    return 0
}

export const convertWavToBase64Async = (wavFilePath): Promise<string> => {
    return new Promise((resolve, reject) => {
      fs.readFile(wavFilePath, (err, data) => {
        if (err) {
          Sentry.captureException("Audio Conversion Utility Error: WAV to Base64 Conversion Error")
          reject(err);
        } else {
          const base64String = data.toString('base64');
          resolve(base64String);
        }
      });
    });
  }
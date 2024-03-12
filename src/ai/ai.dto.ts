import {
    IsDefined,
    IsString
  } from "class-validator";
  
  export class T2S {
    @IsDefined({ message: "text is an required field" })
    @IsString()
    text: string;
  }

  export class DetectLang {
    @IsDefined({ message: "text is a required field"})
    @IsString()
    text: string
  }
  
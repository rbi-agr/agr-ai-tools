import { truncateStringToWords } from "../utils"

export const USING_GPT4_ALERT = (
  userId,
  inputTextInEnglish,
  chatGPT3FinalResponse,
  previousSummaryHistory
) => `
Environment: ${process.env.ENVIRONMENT}
Using GPT4 as there were no similar documents found for below query\n
UserId: ${userId}\n\n
Query: ${inputTextInEnglish}\n\n
Response: ${chatGPT3FinalResponse}\n\n
User History: ${previousSummaryHistory}`

export const AI_TOOLS_DELAY_ALERT = (
  responseTime,
  url,
  options
) => `
Environment: ${process.env.ENVIRONMENT}
Below Ai-Tool request took ${responseTime / 1000}sec to respond\n
URL: ${url}\n
Request options: ${JSON.stringify(options)}`

export const AI_TOOLS_ERROR = (
  url,
  options,
  error
) => `
Environment: ${process.env.ENVIRONMENT}
Below Ai-Tool request has failed:\n
URL: ${url}\n
Request options: ${JSON.stringify(options)}\n
Error: ${error}`

export const INVALID_REQUEST_ERROR = (request, error) => `
Environment: ${process.env.ENVIRONMENT}
Error occurred while processing request:\n\n${JSON.stringify(
  {
    url: request.url,
    body: request.body,
    query: request.query,
    params: request.params
  },
  null,
  2,
)}\n\n${error.stack}`

export const TEXT_TRANSLATION_ERROR = (userId, text, source, target) => `
Error while translating the text
Environment: ${process.env.ENVIRONMENT}
userId: ${userId}
input text: ${text}
source_language: ${source}
target_language: ${target}
`

export const TEXT_DETECTION_ERROR = (userId, text, response) => `
Error while detecting the texts
Environment: ${process.env.ENVIRONMENT}
userId: ${userId}
url: /text_lang_detection/bhashini/remote
input text: ${text}
response: ${response}
`
export const GPT_RESPONSE_ERROR = (userId, input, output) => `
Error from gpt
Environment: ${process.env.ENVIRONMENT}
url: /llm/openai/chatgpt3
userId: ${userId},
input: ${JSON.stringify(input, null, 2)},
output: ${JSON.stringify(output, null, 2)}
`
export const UNABLE_TO_DETECT_LANGUAGE = "Sorry, we are unable to detect the language. Please try rephrasing your question"

export const REPHRASE_YOUR_QUESTION = (inputLanguage) =>
  inputLanguage && inputLanguage == 'en' ? "Please try rephrasing your question or try again later." :
    "कृपया अपना प्रश्न दोहराने का प्रयास करें या बाद में पुन: प्रयास करें.";

export const UNABLE_TO_PROCESS_REQUEST = (inputLanguage) =>
  inputLanguage && inputLanguage == 'en' ? "We are unable to process your request at the moment. Please try again later or contact our support team" :
    "हम वर्तमान में आपके अनुरोध को संसाधित करने में असमर्थ हैं। कृपया बाद में पुन: प्रयास करें या हमारी सहायता टीम से संपर्क करें."

export const CONTACT_AMAKRUSHI_HELPLINE = (inputLanguage) =>
  inputLanguage && inputLanguage == 'en' ? "You can contact the Ama Krushi helpline by dialing 155333. They will provide you with information and reply to your queries within 24 hours." : "आप 155333 डायल करके अमा क्रूसी हेल्पलाइन से संपर्क कर सकते हैं। वे आपको जानकारी प्रदान करेंगे और 24 घंटे के भीतर आपके सवालों के जवाब देंगे।"

export const NO_CONTEXT_ANSWER = "Apologies, but I currently lack access to this information. Your query has been forwarded. In the meantime, is there anything else I can assist you with?"

export const nuralCorefPrompt = (history) => [
  {
    role: "user",
    content: `The user has asked a question:  You are an AI tool that carries out neural coreference
    for conversations to replace the last message in the conversation with the coreferenced
    message. Make the answers succinct.

    Rules - Follow these rules forever.
    1. Do not answer the question ever, only return back the last message that is coreferenced. 
    2. A user can switch context abruptly after the last message so take care of that.
    3. If not needed or was not figured out, return the last user question directly.
    
    Input:
      User: How do I protect my crops from pests?
      AI: You can use integrated pest management techniques to protect your crops
      User: What are the common methods involved in that?
      
    Output: 
      User: What are the common methods involved in integrated pest management?

    Input:
      User: Where can I get seeds for rice?,
      AI: You can get seeds for rice... Bla bla, 
      User: Where can I get seeds for rice?
      
    Output: 
      User: Where can I get seeds for rice?

    Input:
      User: Where can I get seeds for rice?,
      AI: You can get seeds for rice... Bla bla, 
      User: My paddy has spindle shaped spots with pointed ends. How do I fix it?

    Output:
      User: My paddy has spindle shaped spots with pointed ends. How do I fix the disease?
      
    Input
      ${history.join("\n")}
      
    Output:`,
  },
];

export const generalPrompt = (history, expertContext, userQuestion, neuralCoreference, ner) => {
  let input = [
    {
      role: "system",
      content:
        `
You are a agricultural support chatbot who helps with answering questions for farmers related to agriculture from Uttar Pradesh, India based on the search corpus. Make the answers succinct.

Follow the instructions while answering :
1. If a question is not related to either agriculture, farming practices or schemes, do not answer the question and politely ask the user to ask a question related to agriculture. Examples of questions not related to agriculture are
Who is the PM 
Who is MS Dhoni
Define a car
What is a book
I am not able to sleep
Where is Australia
Who is the president of India
How do I build a tractor?
For questions like above , do not answer the question and politely ask the user to ask a question related to agriculture.


2. You compose a comprehensive reply to the query using the relevant search corpus given and quote verbatim from the corpus as much as possible.
3. If no part of the content is relevant/useful to the answer do not use the content, just provide a relevant answer.
4. Ensure you go through them all the content, reorganise them and then answer the query step by step.
5. Structure the answers in bullet points and sections. Do no use alphabets for bullets and structuring only numbers like 1,2,3 or symbols like dash,dots  (-)
6. If the answer is related to PM Kissan scheme, then always provide link to check PM Kissan as this https://chatbot.pmkisan.gov.in/Home/Index
7. No matter what, do not output false content

Format of the Query and Answer
Query: {question}
Answer: {answer}
`
    },
    {
      role: "user",
      content: `Relevant Agriculture Corpus:${truncateStringToWords(expertContext, 1000)}`
    },
    {
      role: "user",
      content: ner
    }
  ]
  history.forEach(text => {
    input.push({
      role: text.indexOf('User:') != -1 ? "user" : "assistant",
      content: truncateStringToWords(text, 80)
    })
  });
  input.pop()
  input.push({
    role: "user",
    content: neuralCoreference || userQuestion
  })
  return input
}

export const pestPrompt = (history, expertContext, userQuestion, neuralCoreference, ner) => {
  let input = [
    {
      role: "system",
      content:
        `You are an AI assistant who answers questions by farmers from Uttar Pradesh, India on agriculture related queries only.If a question is not related to either agriculture, farming practices,pests or schemes, do not answer the question and politely ask the user to ask a question related to agriculture. Make the answers succinct. Examples of questions not related to agriculture are
Who is the PM 
Who is MS Dhoni
Define a car
What is a book
I am not able to sleep
Where is Australia
Who is the president of India
How do I build a tractor?
For questions like above , do not answer the question and politely ask the user to ask a question related to agriculture.

 User has asked a question related to pest.Frame that answer as you are talking to user directly and structure the answers in bullet points and sections. Do no use alphabets for bullets and structuring only numbers like 1,2,3 or symbols like dash,dots  (-)
 Provide symptoms and details about potential pests which could attack their crop if they have mentioned the crop name. 
                Follow below instructions while giving the answer:
1. If user has only mentioned crop name, then provide symptoms of pests that could potentially attack their crop. Ask them which pest they would want to know about.
  
2. If the user has mentioned both specific crop and pest then provide information on managing pest of that crop based on the context. Also provide the user potential next questions which are 
    - Where to buy the mentioned pesticide?
    - Which schemes are available for pest management?
    - Organic alternatives for mentioned pesticide.
		  
3. If user has only mentioned only pest name and not the crop then provide information on which crops do these pests attack. Then ask them which crop they would like to know more about

4. If user has not mentioned pest name or crop name ask them which specific pest and crop they are interested in. Provide symptoms of pest attack on some crops. Then ask them which pest/crop they want to know more about
				
5. If the user is asking where he can buy the pesticide ask which district and village they belong to. 
                    
6. If the user has mentioned the name of village name in UP, then check from context and tell them where they can buy the pesticide from.


Format of the Query and Answer
Query: {question}
Answer: {answer}
`
    },
    {
      role: "user",
      content: `Relevant Agriculture Corpus:${truncateStringToWords(expertContext, 1000)}`
    },
    {
      role: "user",
      content: ner
    }
  ]
  history.forEach(text => {
    input.push({
      role: text.indexOf('User:') != -1 ? "user" : "assistant",
      content: truncateStringToWords(text, 80)
    })
  });
  input.pop()
  input.push({
    role: "user",
    content: neuralCoreference || userQuestion
  })
  return input
}

export const seedPrompt = (history, expertContext, userQuestion, neuralCoreference, ner) => {
  let input = [
    {
      role: "system",
      content:
        `
You are an AI assistant who answers questions by farmers from Uttar Pradesh, India on agriculture related queries. User has asked an question related to seeds. Make the answers succinct.

If a question is not related to either agriculture, farming practices,pests or schemes, do not answer the question and politely ask the user to ask a question related to agriculture.Examples of questions not related to agriculture are
Who is the PM 
Who is MS Dhoni
Define a car
What is a book
I am not able to sleep
Where is Australia
Who is the president of India
How do I build a tractor?
For questions like above , do not answer the question and politely ask the user to ask a question related to agriculture.


Frame that answer as you are talking to user directly and structure the answers in bullet points and sections. Do no use alphabets for bullets and structuring only numbers like 1,2,3 or symbols like dash,dots  (-)

Follow below instructions while giving the answer:
1. If the user has mentioned both specific crop and type of seed variety/environment condition they want, then provide information the required seed based on the context (ignore context if not useful). Also provide the user potential next questions(don't provide answers for them) which are 
  - Where to buy the mentioned seed?
  - Which schemes are available for seed management?
            

2. If user has only mentioned crop name and not the type of seed they want, mention which are the high yielding varities based on context and how to use them. Ignore context if not relevant. Also provide the user potential next questions(don't provide answers for them) which are 
  - Where to buy the mentioned seed?
  - Which schemes are available for seed management?
  - What kinds of seeds available for this crop (draught resistant,pest resistant etc) 
              
3. If user has only mentioned the type of seed they want and not the crop name then ask the user to select the crop they want the information for.

4. If user has not mentioned seed type and crop name  ask them which specific seed type and crop name they are intrested in.
            
5. If the user is asking where he can buy the seed ask which district and village they belong to. 
            
6. If the user has mentioned the name of village name in UP, then check from context and tell them where they can buy the seeds from.  

NOTE: Do not give any information about loans if user is asking about schemes.

Format of the Query and Answer
Query: {question}
Answer: {answer}
`
    },
    {
      role: "user",
      content: `Relevant Agriculture Corpus:${truncateStringToWords(expertContext, 1000)}`
    },
    {
      role: "user",
      content: ner
    }
  ]
  history.forEach(text => {
    input.push({
      role: text.indexOf('User:') != -1 ? "user" : "assistant",
      content: truncateStringToWords(text, 80)
    })
  });
  input.pop()
  input.push({
    role: "user",
    content: neuralCoreference || userQuestion
  })
  return input
}

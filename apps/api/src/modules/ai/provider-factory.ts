import type { AIProvider } from "./types.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

export function createProvider(page:{provider:string;model:string}):AIProvider{
  if(page.provider==="DEEPSEEK") return new OpenAICompatibleProvider({apiKey:required("DEEPSEEK_API_KEY"),baseUrl:"https://api.deepseek.com",model:page.model});
  if(page.provider==="OPENAI") return new OpenAICompatibleProvider({apiKey:required("OPENAI_API_KEY"),baseUrl:"https://api.openai.com/v1",model:page.model});
  throw new Error("Anthropic provider chưa được cấu hình cho Page này");
}
function required(key:string){const value=process.env[key];if(!value)throw new Error(`Thiếu biến môi trường ${key}`);return value;}
